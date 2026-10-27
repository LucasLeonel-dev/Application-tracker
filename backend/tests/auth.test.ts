import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestApp, prisma, resetDb, STRONG_PASSWORD } from "./helpers.js";

describe("auth", () => {
    let app: FastifyInstance;
    const user = { name: "Lucas", email: "lucas@teste.com", password: STRONG_PASSWORD };

    beforeAll(async () => {
        app = await createTestApp();
    });

    beforeEach(async () => {
        await resetDb();
    });

    afterAll(async () => {
        await app.close();
        await prisma.$disconnect();
    });

    describe("POST /register", () => {
        it("cria o usuario e nao devolve a senha", async () => {
            const res = await app.inject({ method: "POST", url: "/register", payload: user });

            expect(res.statusCode).toBe(201);
            const body = res.json();
            expect(body).toEqual({ id: expect.any(String), name: user.name, email: user.email });
        });

        it("salva a senha como hash bcrypt, nunca em texto puro", async () => {
            await app.inject({ method: "POST", url: "/register", payload: user });

            const saved = await prisma.user.findUniqueOrThrow({ where: { email: user.email } });
            expect(saved.passwordHash).not.toBe(user.password);
            expect(saved.passwordHash).toMatch(/^\$2[aby]\$10\$/);
        });

        it("email ja cadastrado da 409", async () => {
            await app.inject({ method: "POST", url: "/register", payload: user });
            const res = await app.inject({ method: "POST", url: "/register", payload: user });

            expect(res.statusCode).toBe(409);
            expect(res.json()).toEqual({ message: "Email já cadastrado" });
        });

        it.each([
            ["curta", "Ab@1"],
            ["sem maiuscula", "senha@123"],
            ["sem numero", "Senha@abc"],
            ["sem caractere especial", "Senha1234"],
        ])("senha %s da 400", async (_, password) => {
            const res = await app.inject({ method: "POST", url: "/register", payload: { ...user, password } });

            expect(res.statusCode).toBe(400);
            expect(res.json().issues[0].path).toBe("password");
        });

        it("email invalido da 400", async () => {
            const res = await app.inject({ method: "POST", url: "/register", payload: { ...user, email: "lucas" } });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("POST /login", () => {
        beforeEach(async () => {
            await app.inject({ method: "POST", url: "/register", payload: user });
        });

        it("credenciais corretas devolvem um JWT com o id do usuario no sub", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: user.email, password: user.password } });

            expect(res.statusCode).toBe(200);
            const { token } = res.json();
            const saved = await prisma.user.findUniqueOrThrow({ where: { email: user.email } });
            expect(app.jwt.decode<{ sub: string }>(token)?.sub).toBe(saved.id);
        });

        it("senha errada da 401", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: user.email, password: "Errada@123" } });

            expect(res.statusCode).toBe(401);
            expect(res.json()).toEqual({ message: "Credenciais inválidas" });
        });

        it("email inexistente da 401 com a mesma mensagem (nao revela se o email existe)", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: "ninguem@teste.com", password: user.password } });

            expect(res.statusCode).toBe(401);
            expect(res.json()).toEqual({ message: "Credenciais inválidas" });
        });
    });

    describe("rotas protegidas", () => {
        it("sem token da 401", async () => {
            const res = await app.inject({ method: "GET", url: "/companies" });

            expect(res.statusCode).toBe(401);
            expect(res.json()).toEqual({ message: "Token inválido ou ausente" });
        });

        it("token invalido da 401", async () => {
            const res = await app.inject({ method: "GET", url: "/companies", headers: { authorization: "Bearer abc.def.ghi" } });

            expect(res.statusCode).toBe(401);
        });

        it("token assinado com outro segredo da 401", async () => {
            //header.payload validos, assinatura falsa
            const [header, payload] = app.jwt.sign({ sub: "qualquer" }).split(".");
            const res = await app.inject({ method: "GET", url: "/companies", headers: { authorization: `Bearer ${header}.${payload}.assinaturafalsa` } });

            expect(res.statusCode).toBe(401);
        });
    });
});
