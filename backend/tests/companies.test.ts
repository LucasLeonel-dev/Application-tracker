import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { createCompany, createTestApp, createUserAndLogin, FAKE_UUID, prisma, resetDb } from "./helpers.js";

describe("companies", () => {
    let app: FastifyInstance;
    let headers: Record<string, string>;

    beforeAll(async () => {
        app = await createTestApp();
    });

    beforeEach(async () => {
        await resetDb();
        ({ headers } = await createUserAndLogin(app));
    });

    afterAll(async () => {
        await app.close();
        await prisma.$disconnect();
    });

    describe("POST /companies", () => {
        it("cria a empresa com o nome normalizado", async () => {
            const res = await app.inject({ method: "POST", url: "/companies", headers, payload: { name: "Mercado Livre", website: "https://mercadolivre.com" } });

            expect(res.statusCode).toBe(201);
            expect(res.json()).toMatchObject({ name: "Mercado Livre", normalizedName: "MERCADOLIVRE", website: "https://mercadolivre.com" });
        });

        it("mesmo nome com outra caixa/espacos da 409", async () => {
            await createCompany(app, headers, "Google");
            const res = await app.inject({ method: "POST", url: "/companies", headers, payload: { name: "  goo GLE " } });

            expect(res.statusCode).toBe(409);
            expect(res.json()).toEqual({ message: "Empresa já cadastrada" });
        });

        it("usuarios diferentes podem ter empresas com o mesmo nome", async () => {
            await createCompany(app, headers, "Google");
            const other = await createUserAndLogin(app);
            const res = await app.inject({ method: "POST", url: "/companies", headers: other.headers, payload: { name: "Google" } });

            expect(res.statusCode).toBe(201);
        });

        it.each([
            ["nome vazio", { name: "   " }],
            ["sem nome", {}],
            ["website invalido", { name: "X", website: "nao-e-url" }],
        ])("%s da 400", async (_, payload) => {
            const res = await app.inject({ method: "POST", url: "/companies", headers, payload });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /companies", () => {
        it("lista so as empresas do usuario, da mais recente para a mais antiga", async () => {
            await createCompany(app, headers, "Primeira");
            await createCompany(app, headers, "Segunda");
            const other = await createUserAndLogin(app);
            await createCompany(app, other.headers, "De outro usuario");

            const res = await app.inject({ method: "GET", url: "/companies", headers });

            expect(res.statusCode).toBe(200);
            expect(res.json().map((c: { name: string }) => c.name)).toEqual(["Segunda", "Primeira"]);
        });
    });

    describe("GET /companies/:id", () => {
        it("devolve a empresa", async () => {
            const company = await createCompany(app, headers);
            const res = await app.inject({ method: "GET", url: `/companies/${company.id}`, headers });

            expect(res.statusCode).toBe(200);
            expect(res.json().id).toBe(company.id);
        });

        it("id fora do formato uuid da 400", async () => {
            const res = await app.inject({ method: "GET", url: "/companies/abc", headers });

            expect(res.statusCode).toBe(400);
        });

        it("id inexistente da 404", async () => {
            const res = await app.inject({ method: "GET", url: `/companies/${FAKE_UUID}`, headers });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("PUT /companies/:id", () => {
        it("substitui os dados e recalcula o normalizedName", async () => {
            const company = await createCompany(app, headers, "Google");
            const res = await app.inject({ method: "PUT", url: `/companies/${company.id}`, headers, payload: { name: "Google Brasil", website: "https://google.com.br" } });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toMatchObject({ name: "Google Brasil", normalizedName: "GOOGLEBRASIL", website: "https://google.com.br" });
        });

        it("website ausente apaga o valor atual", async () => {
            const created = await app.inject({ method: "POST", url: "/companies", headers, payload: { name: "Google", website: "https://google.com" } });
            const res = await app.inject({ method: "PUT", url: `/companies/${created.json().id}`, headers, payload: { name: "Google" } });

            expect(res.json().website).toBeNull();
        });

        it("renomear para uma empresa que o usuario ja tem da 409", async () => {
            await createCompany(app, headers, "Google");
            const company = await createCompany(app, headers, "Amazon");
            const res = await app.inject({ method: "PUT", url: `/companies/${company.id}`, headers, payload: { name: "google" } });

            expect(res.statusCode).toBe(409);
        });

        it("body invalido da 400 mesmo com id inexistente (valida antes de consultar o banco)", async () => {
            const res = await app.inject({ method: "PUT", url: `/companies/${FAKE_UUID}`, headers, payload: {} });

            expect(res.statusCode).toBe(400);
        });

        it("id inexistente com body valido da 404", async () => {
            const res = await app.inject({ method: "PUT", url: `/companies/${FAKE_UUID}`, headers, payload: { name: "X" } });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("DELETE /companies/:id", () => {
        it("remove a empresa", async () => {
            const company = await createCompany(app, headers);
            const res = await app.inject({ method: "DELETE", url: `/companies/${company.id}`, headers });

            expect(res.statusCode).toBe(204);
            expect(await prisma.company.count()).toBe(0);
        });

        it("empresa com candidaturas vinculadas da 409", async () => {
            const company = await createCompany(app, headers);
            await app.inject({ method: "POST", url: "/applications", headers, payload: { companyId: company.id, roleTitle: "Dev", appliedAt: "2026-10-27" } });

            const res = await app.inject({ method: "DELETE", url: `/companies/${company.id}`, headers });

            expect(res.statusCode).toBe(409);
            expect(await prisma.company.count()).toBe(1);
        });

        it("id inexistente da 404", async () => {
            const res = await app.inject({ method: "DELETE", url: `/companies/${FAKE_UUID}`, headers });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("isolamento entre usuarios", () => {
        it("outro usuario recebe 404 ao ler, editar ou apagar a empresa", async () => {
            const company = await createCompany(app, headers);
            const other = await createUserAndLogin(app);
            const url = `/companies/${company.id}`;

            const get = await app.inject({ method: "GET", url, headers: other.headers });
            const put = await app.inject({ method: "PUT", url, headers: other.headers, payload: { name: "Hackeada" } });
            const del = await app.inject({ method: "DELETE", url, headers: other.headers });

            expect([get.statusCode, put.statusCode, del.statusCode]).toEqual([404, 404, 404]);
            const intact = await prisma.company.findUniqueOrThrow({ where: { id: company.id } });
            expect(intact.name).toBe("Google");
        });
    });
});
