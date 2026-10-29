import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestApp, createUserAndLogin, prisma, resetDb } from "./helpers.js";

describe("infra e error handler", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createTestApp();
        await resetDb();
    });

    afterAll(async () => {
        await app.close();
        await prisma.$disconnect();
    });

    it("GET /health responde ok", async () => {
        const res = await app.inject({ method: "GET", url: "/health" });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: "ok" });
    });

    it("JSON malformado vira 400, nao 500", async () => {
        const { headers } = await createUserAndLogin(app);

        const res = await app.inject({
            method: "POST",
            url: "/companies",
            headers: { ...headers, "content-type": "application/json" },
            payload: "{nome:",
        });

        expect(res.statusCode).toBe(400);
        expect(res.json()).toEqual({ message: "Requisição inválida" });
    });

    it("ZodError vira 400 com a lista de issues", async () => {
        const res = await app.inject({ method: "POST", url: "/login", payload: { email: "nao-e-email" } });

        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body.message).toBe("Dados inválidos");
        expect(body.issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(["email", "password"]));
    });

    it("/docs/json documenta as 14 operacoes com tag, resumo e respostas", async () => {
        const res = await app.inject({ method: "GET", url: "/docs/json" });
        const ops = Object.entries(res.json().paths).flatMap(([path, methods]) =>
            Object.entries(methods as object).map(([method, op]) => ({ route: `${method.toUpperCase()} ${path}`, ...op })),
        );

        //rotas sem caso de erro: documentam so a resposta de sucesso
        const successOnly = ["POST /logout"];

        expect(ops).toHaveLength(14);
        for (const op of ops) {
            expect(op.tags.length, op.route).toBeGreaterThan(0);
            expect(op.summary, op.route).toBeTruthy();
            expect(Object.keys(op.responses).length, op.route).toBeGreaterThanOrEqual(successOnly.includes(op.route) ? 1 : 2);
        }
    });
});
