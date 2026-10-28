import { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export { prisma };

export const FAKE_UUID = "00000000-0000-0000-0000-000000000000";
export const STRONG_PASSWORD = "Senha@123";

//rate limit desligado por padrao: os testes de CRUD criam muitos usuarios pelo mesmo IP no mesmo minuto
export async function createTestApp({ rateLimit = false } = {}) {
    const app = buildApp({ rateLimit });
    await app.ready(); //espera todos os plugins e rotas carregarem
    return app;
}

//ordem importa por causa das FKs: candidaturas -> empresas -> usuarios
export async function resetDb() {
    await prisma.application.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
}

//se o preparo do teste falhar, para ali com a causa real
//(sem isso um register quebrado viraria "Bearer undefined" e o erro apareceria como um 401 sem sentido la na frente)
export function expectStatus(res: LightMyRequestResponse, expected: number, step: string) {
    if (res.statusCode !== expected) {
        throw new Error(`${step}: esperado ${expected}, veio ${res.statusCode} — ${res.body}`);
    }
    return res;
}

let userCounter = 0;

//cria um usuario novo e devolve o header de autorizacao pronto pra usar no inject
export async function createUserAndLogin(app: FastifyInstance) {
    const email = `user${++userCounter}@teste.com`;

    expectStatus(await app.inject({
        method: "POST",
        url: "/register",
        payload: { name: `User ${userCounter}`, email, password: STRONG_PASSWORD },
    }), 201, "register no preparo");

    const login = expectStatus(await app.inject({
        method: "POST",
        url: "/login",
        payload: { email, password: STRONG_PASSWORD },
    }), 200, "login no preparo");

    return { email, headers: authCookieHeader(login) };
}

//faz o papel do navegador: pega o cookie que o login gravou e devolve pronto pra reenviar
export function authCookieHeader(loginResponse: LightMyRequestResponse) {
    const cookie = loginResponse.cookies.find((c) => c.name === "token");
    if (!cookie) {
        throw new Error(`login nao gravou o cookie "token" — ${loginResponse.body}`);
    }
    return { cookie: `token=${cookie.value}` };
}

export async function createCompany(app: FastifyInstance, headers: Record<string, string>, name = "Google") {
    const res = await app.inject({ method: "POST", url: "/companies", headers, payload: { name } });
    return expectStatus(res, 201, `criar empresa "${name}" no preparo`).json<{ id: string; name: string; normalizedName: string }>();
}
