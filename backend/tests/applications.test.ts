import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { createCompany, createTestApp, createUserAndLogin, FAKE_UUID, prisma, resetDb } from "./helpers.js";

describe("applications", () => {
    let app: FastifyInstance;
    let headers: Record<string, string>;
    let companyId: string;

    const newApplication = (overrides: Record<string, unknown> = {}) => ({
        companyId,
        roleTitle: "Estagiário Backend",
        appliedAt: "2026-10-27",
        ...overrides,
    });

    async function createApplication(overrides: Record<string, unknown> = {}) {
        const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication(overrides) });
        return res.json<{ id: string; status: string; roleTitle: string }>();
    }

    beforeAll(async () => {
        app = await createTestApp();
    });

    beforeEach(async () => {
        await resetDb();
        ({ headers } = await createUserAndLogin(app));
        companyId = (await createCompany(app, headers)).id;
    });

    afterAll(async () => {
        await app.close();
        await prisma.$disconnect();
    });

    describe("POST /applications", () => {
        it("cria com status applied por padrao e devolve a empresa junto", async () => {
            const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication() });

            expect(res.statusCode).toBe(201);
            expect(res.json()).toMatchObject({
                roleTitle: "Estagiário Backend",
                status: "applied",
                notes: null,
                appliedAt: "2026-10-27T00:00:00.000Z",
                company: { id: companyId, name: "Google" },
            });
        });

        it("aceita status e notes explicitos", async () => {
            const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication({ status: "interview", notes: "  falar com RH  " }) });

            expect(res.json()).toMatchObject({ status: "interview", notes: "falar com RH" });
        });

        it("mesma vaga na mesma empresa da 409", async () => {
            await createApplication();
            const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication() });

            expect(res.statusCode).toBe(409);
            expect(res.json()).toEqual({ message: "Candidatura já cadastrada para essa vaga" });
        });

        it("empresa inexistente da 404", async () => {
            const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication({ companyId: FAKE_UUID }) });

            expect(res.statusCode).toBe(404);
            expect(res.json()).toEqual({ message: "Empresa não encontrada" });
        });

        it.each([
            ["status fora do enum", { status: "hired" }],
            ["data invalida", { appliedAt: "ontem" }],
            ["companyId fora do formato uuid", { companyId: "abc" }],
            ["roleTitle vazio", { roleTitle: "  " }],
        ])("%s da 400", async (_, overrides) => {
            const res = await app.inject({ method: "POST", url: "/applications", headers, payload: newApplication(overrides) });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /applications", () => {
        it("filtra por status e por empresa", async () => {
            const otherCompanyId = (await createCompany(app, headers, "Amazon")).id;
            await createApplication({ roleTitle: "A" });
            await createApplication({ roleTitle: "B", status: "offer" });
            await createApplication({ roleTitle: "C", companyId: otherCompanyId });

            const titles = async (query: string) => {
                const res = await app.inject({ method: "GET", url: `/applications${query}`, headers });
                expect(res.statusCode).toBe(200);
                return res.json().map((a: { roleTitle: string }) => a.roleTitle).sort();
            };

            expect(await titles("")).toEqual(["A", "B", "C"]);
            expect(await titles("?status=offer")).toEqual(["B"]);
            expect(await titles(`?companyId=${companyId}`)).toEqual(["A", "B"]);
            expect(await titles(`?companyId=${companyId}&status=applied`)).toEqual(["A"]);
            expect(await titles("?status=rejected")).toEqual([]);
        });

        it("status invalido no filtro da 400", async () => {
            const res = await app.inject({ method: "GET", url: "/applications?status=xyz", headers });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /applications/:id", () => {
        it("devolve a candidatura com a empresa", async () => {
            const created = await createApplication();
            const res = await app.inject({ method: "GET", url: `/applications/${created.id}`, headers });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toMatchObject({ id: created.id, company: { id: companyId } });
        });

        it("id inexistente da 404", async () => {
            const res = await app.inject({ method: "GET", url: `/applications/${FAKE_UUID}`, headers });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("PATCH /applications/:id", () => {
        it("altera so os campos enviados", async () => {
            const created = await createApplication({ notes: "original" });
            const res = await app.inject({ method: "PATCH", url: `/applications/${created.id}`, headers, payload: { status: "interview" } });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toMatchObject({ status: "interview", roleTitle: "Estagiário Backend", notes: "original" });
        });

        it("notes null apaga a anotacao", async () => {
            const created = await createApplication({ notes: "apagar" });
            const res = await app.inject({ method: "PATCH", url: `/applications/${created.id}`, headers, payload: { notes: null } });

            expect(res.json().notes).toBeNull();
        });

        it("body vazio da 400", async () => {
            const created = await createApplication();
            const res = await app.inject({ method: "PATCH", url: `/applications/${created.id}`, headers, payload: {} });

            expect(res.statusCode).toBe(400);
            expect(res.json().issues[0].message).toBe("Informe pelo menos um campo para editar");
        });

        it("body invalido da 400 mesmo com id inexistente (valida antes de consultar o banco)", async () => {
            const res = await app.inject({ method: "PATCH", url: `/applications/${FAKE_UUID}`, headers, payload: { status: "hired" } });

            expect(res.statusCode).toBe(400);
        });

        it("id inexistente com body valido da 404", async () => {
            const res = await app.inject({ method: "PATCH", url: `/applications/${FAKE_UUID}`, headers, payload: { status: "offer" } });

            expect(res.statusCode).toBe(404);
        });

        it("renomear para uma vaga que ja existe na mesma empresa da 409", async () => {
            await createApplication({ roleTitle: "Dev" });
            const created = await createApplication({ roleTitle: "QA" });
            const res = await app.inject({ method: "PATCH", url: `/applications/${created.id}`, headers, payload: { roleTitle: "Dev" } });

            expect(res.statusCode).toBe(409);
        });
    });

    describe("DELETE /applications/:id", () => {
        it("remove a candidatura", async () => {
            const created = await createApplication();
            const res = await app.inject({ method: "DELETE", url: `/applications/${created.id}`, headers });

            expect(res.statusCode).toBe(204);
            expect(await prisma.application.count()).toBe(0);
        });

        it("id inexistente da 404", async () => {
            const res = await app.inject({ method: "DELETE", url: `/applications/${FAKE_UUID}`, headers });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("isolamento entre usuarios", () => {
        it("outro usuario recebe 404 ao ler, editar ou apagar a candidatura", async () => {
            const created = await createApplication();
            const other = await createUserAndLogin(app);
            const url = `/applications/${created.id}`;

            const get = await app.inject({ method: "GET", url, headers: other.headers });
            const patch = await app.inject({ method: "PATCH", url, headers: other.headers, payload: { status: "rejected" } });
            const del = await app.inject({ method: "DELETE", url, headers: other.headers });

            expect([get.statusCode, patch.statusCode, del.statusCode]).toEqual([404, 404, 404]);
            const intact = await prisma.application.findUniqueOrThrow({ where: { id: created.id } });
            expect(intact.status).toBe("applied");
        });

        it("outro usuario nao ve a candidatura na listagem", async () => {
            await createApplication();
            const other = await createUserAndLogin(app);
            const res = await app.inject({ method: "GET", url: "/applications", headers: other.headers });

            expect(res.json()).toEqual([]);
        });

        it("nao da pra criar candidatura na empresa de outro usuario", async () => {
            const other = await createUserAndLogin(app);
            const res = await app.inject({ method: "POST", url: "/applications", headers: other.headers, payload: newApplication() });

            expect(res.statusCode).toBe(404);
        });
    });
});
