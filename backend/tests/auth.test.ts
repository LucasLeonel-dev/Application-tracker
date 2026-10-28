import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { createTestApp, createUserAndLogin, prisma, resetDb, STRONG_PASSWORD } from "./helpers.js";
import { env } from "../src/lib/env.js";

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

        it("devolve os dados do usuario e NAO devolve o token no corpo", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: user.email, password: user.password } });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ id: expect.any(String), name: user.name, email: user.email }); //sem token, sem passwordHash
        });

        it("grava o JWT num cookie httpOnly, sameSite lax, que expira junto com o token", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: user.email, password: user.password } });
            const cookie = res.cookies.find((c) => c.name === "token")!;

            expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
            expect(cookie.secure).toBeFalsy(); //so em production (NODE_ENV dos testes nao e production)

            const saved = await prisma.user.findUniqueOrThrow({ where: { email: user.email } });
            const payload = app.jwt.decode<{ sub: string; exp: number }>(cookie.value)!;
            expect(payload.sub).toBe(saved.id);
            expect((cookie.expires as Date).getTime()).toBe(payload.exp * 1000);
        });

        it("senha errada da 401 e nao grava cookie", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: user.email, password: "Errada@123" } });

            expect(res.statusCode).toBe(401);
            expect(res.json()).toEqual({ message: "Credenciais inválidas" });
            expect(res.cookies).toHaveLength(0);
        });

        it("email inexistente da 401 com a mesma mensagem (nao revela se o email existe)", async () => {
            const res = await app.inject({ method: "POST", url: "/login", payload: { email: "ninguem@teste.com", password: user.password } });

            expect(res.statusCode).toBe(401);
            expect(res.json()).toEqual({ message: "Credenciais inválidas" });
        });

        it("email inexistente tambem passa pelo bcrypt (mesmo tempo de resposta, nao revela se o email existe)", async () => {
            //medir tempo deixaria o teste instavel: o que garante o tempo parecido e o bcrypt.compare rodar nos dois caminhos
            const compare = vi.spyOn(bcrypt, "compare");
            try {
                await app.inject({ method: "POST", url: "/login", payload: { email: "ninguem@teste.com", password: user.password } });

                expect(compare).toHaveBeenCalledTimes(1);
            } finally {
                compare.mockRestore();
            }
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

        it("token com assinatura adulterada da 401", async () => {
            //header e payload validos, assinatura trocada: e o que acontece se alguem editar o sub do token na mao
            const [header, payload] = app.jwt.sign({ sub: "qualquer" }).split(".");
            const res = await app.inject({ method: "GET", url: "/companies", headers: { authorization: `Bearer ${header}.${payload}.assinaturafalsa` } });

            expect(res.statusCode).toBe(401);
        });

        it("token valido de um usuario que nao existe mais da 401", async () => {
            const { email, headers } = await createUserAndLogin(app);
            await prisma.user.delete({ where: { email } }); //o token continua assinado e dentro da validade

            const list = await app.inject({ method: "GET", url: "/companies", headers });
            const create = await app.inject({ method: "POST", url: "/companies", headers, payload: { name: "Google" } }); //antes: FK violada -> 500

            expect([list.statusCode, create.statusCode]).toEqual([401, 401]);
            expect(create.json()).toEqual({ message: "Token inválido ou ausente" });
        });

        it("token expirado da 401", async () => {
            //iat 2h atras + expiresIn 1h do .env.test = expirou ha 1h
            const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
            //o payload e tipado como { sub } (types/fastify.d.ts); iat so faz sentido aqui no teste, por isso o cast
            const expiredPayload = { sub: "qualquer", iat: twoHoursAgo };
            const token = app.jwt.sign(expiredPayload as { sub: string });
            expect(app.jwt.decode<{ exp: number }>(token)!.exp * 1000).toBeLessThan(Date.now()); //garante que o token montado ja nasceu vencido

            const res = await app.inject({ method: "GET", url: "/companies", headers: { authorization: `Bearer ${token}` } });

            expect(res.statusCode).toBe(401);
        });
    });
    describe("GET /me", () => {
        it("com o cookie devolve o usuario logado", async () => {
            const { email, headers } = await createUserAndLogin(app);
            const res = await app.inject({ method: "GET", url: "/me", headers });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toEqual({ id: expect.any(String), name: expect.any(String), email });
        });

        it("sem cookie da 401", async () => {
            const res = await app.inject({ method: "GET", url: "/me" });

            expect(res.statusCode).toBe(401);
        });

        it("header Authorization: Bearer continua funcionando (Insomnia, Postman)", async () => {
            const { headers } = await createUserAndLogin(app);
            const token = headers.cookie.replace("token=", "");
            const res = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${token}` } });

            expect(res.statusCode).toBe(200);
        });
    });

    describe("POST /logout", () => {
        it("apaga o cookie (mesmo nome e path do login)", async () => {
            const { headers } = await createUserAndLogin(app);
            const res = await app.inject({ method: "POST", url: "/logout", headers });

            expect(res.statusCode).toBe(204);
            const cleared = res.cookies.find((c) => c.name === "token")!;
            expect(cleared.value).toBe("");
            expect(cleared.path).toBe("/");
            expect((cleared.expires as Date).getTime()).toBeLessThan(Date.now()); //data no passado = navegador descarta
        });

        it("funciona mesmo sem estar logado (sair nunca falha)", async () => {
            const res = await app.inject({ method: "POST", url: "/logout" });

            expect(res.statusCode).toBe(204);
        });
    });

    describe("CORS", () => {
        it("libera so a origem do frontend, com credenciais", async () => {
            const res = await app.inject({ method: "GET", url: "/health", headers: { origin: env.FRONTEND_URL } });

            expect(res.headers["access-control-allow-origin"]).toBe(env.FRONTEND_URL);
            expect(res.headers["access-control-allow-credentials"]).toBe("true");
        });

        it("nao libera outra origem", async () => {
            const res = await app.inject({ method: "GET", url: "/health", headers: { origin: "https://site-malicioso.com" } });

            expect(res.headers["access-control-allow-origin"]).not.toBe("https://site-malicioso.com");
            expect(res.headers["access-control-allow-origin"]).not.toBe("*");
        });
    });
});
