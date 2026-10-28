import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance, InjectOptions } from "fastify";
import { createTestApp, createUserAndLogin, prisma, resetDb, STRONG_PASSWORD } from "./helpers.js";
import { authRateLimit, insertRateLimit } from "../src/plugins/rateLimit.js";

describe("rate limit", () => {
    let app: FastifyInstance;

    //app novo a cada teste: o contador fica em memoria na instancia, assim um teste nao herda as tentativas do outro
    beforeEach(async () => {
        await resetDb();
        app = await createTestApp({ rateLimit: true });
    });

    afterEach(async () => {
        await app.close();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    //dispara `times` requisicoes em sequencia e devolve os status
    async function hit(times: number, options: (i: number) => InjectOptions) {
        const statuses: number[] = [];
        for (let i = 0; i < times; i++) {
            statuses.push((await app.inject(options(i))).statusCode);
        }
        return statuses;
    }

    it("POST /login: bloqueia a partir da 6a tentativa no minuto, mesmo com senha errada", async () => {
        const statuses = await hit(authRateLimit.max, () => ({
            method: "POST", url: "/login", payload: { email: "alvo@teste.com", password: "Chute@123" },
        }));
        expect(statuses).toEqual(Array(authRateLimit.max).fill(401));

        const blocked = await app.inject({ method: "POST", url: "/login", payload: { email: "alvo@teste.com", password: "Chute@123" } });

        expect(blocked.statusCode).toBe(429);
        expect(blocked.json()).toEqual({ message: "Muitas tentativas, tente novamente em instantes" });
        expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0); //quantos segundos ate liberar
    });

    it("POST /login: depois de bloqueado, nem a senha certa passa", async () => {
        await app.inject({ method: "POST", url: "/register", payload: { name: "Alvo", email: "alvo@teste.com", password: STRONG_PASSWORD } });
        await hit(authRateLimit.max, () => ({ method: "POST", url: "/login", payload: { email: "alvo@teste.com", password: "Chute@123" } }));

        const res = await app.inject({ method: "POST", url: "/login", payload: { email: "alvo@teste.com", password: STRONG_PASSWORD } });

        expect(res.statusCode).toBe(429);
    });

    it("POST /register: bloqueia a partir da 6a conta no minuto", async () => {
        const statuses = await hit(authRateLimit.max + 1, (i) => ({
            method: "POST", url: "/register", payload: { name: "Bot", email: `bot${i}@teste.com`, password: STRONG_PASSWORD },
        }));

        expect(statuses).toEqual([...Array(authRateLimit.max).fill(201), 429]);
        expect(await prisma.user.count()).toBe(authRateLimit.max); //a 6a nem chegou no banco
    });

    it("o limite e por IP: outro IP continua liberado", async () => {
        await hit(authRateLimit.max + 1, () => ({ method: "POST", url: "/login", remoteAddress: "10.0.0.1", payload: { email: "a@teste.com", password: "Chute@123" } }));

        const otherIp = await app.inject({ method: "POST", url: "/login", remoteAddress: "10.0.0.2", payload: { email: "a@teste.com", password: "Chute@123" } });

        expect(otherIp.statusCode).toBe(401);
    });

    it("cada rota tem o proprio contador: estourar o /login nao bloqueia o /register", async () => {
        await hit(authRateLimit.max + 1, () => ({ method: "POST", url: "/login", payload: { email: "a@teste.com", password: "Chute@123" } }));

        const res = await app.inject({ method: "POST", url: "/register", payload: { name: "Novo", email: "novo@teste.com", password: STRONG_PASSWORD } });

        expect(res.statusCode).toBe(201);
    });

    it("POST /companies: bloqueia a partir da 31a insercao no minuto", async () => {
        const { headers } = await createUserAndLogin(app);

        const statuses = await hit(insertRateLimit.max + 1, (i) => ({
            method: "POST", url: "/companies", headers, payload: { name: `Empresa ${i}` },
        }));

        expect(statuses).toEqual([...Array(insertRateLimit.max).fill(201), 429]);
        expect(await prisma.company.count()).toBe(insertRateLimit.max);
    });

    it("POST /applications: bloqueia a partir da 31a insercao no minuto", async () => {
        const { headers } = await createUserAndLogin(app);
        const company = (await app.inject({ method: "POST", url: "/companies", headers, payload: { name: "Google" } })).json();

        const statuses = await hit(insertRateLimit.max + 1, (i) => ({
            method: "POST", url: "/applications", headers, payload: { companyId: company.id, roleTitle: `Vaga ${i}`, appliedAt: "2026-10-28" },
        }));

        expect(statuses).toEqual([...Array(insertRateLimit.max).fill(201), 429]);
        expect(await prisma.application.count()).toBe(insertRateLimit.max);
    });

    it("rotas de leitura nao tem limite", async () => {
        const { headers } = await createUserAndLogin(app);

        const statuses = await hit(insertRateLimit.max + 5, () => ({ method: "GET", url: "/companies", headers }));

        expect(statuses.every((s) => s === 200)).toBe(true);
    });

    it("/docs/json documenta o 429 nas 4 rotas limitadas", async () => {
        const { paths } = (await app.inject({ method: "GET", url: "/docs/json" })).json();

        for (const [path, method] of [["/login", "post"], ["/register", "post"], ["/companies", "post"], ["/applications", "post"]]) {
            expect(paths[path][method].responses, `${method.toUpperCase()} ${path}`).toHaveProperty("429");
        }
    });
});
