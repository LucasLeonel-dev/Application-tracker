import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export { prisma };

export const FAKE_UUID = "00000000-0000-0000-0000-000000000000";
export const STRONG_PASSWORD = "Senha@123";

export async function createTestApp() {
    const app = buildApp();
    await app.ready(); //espera todos os plugins e rotas carregarem
    return app;
}

//ordem importa por causa das FKs: candidaturas -> empresas -> usuarios
export async function resetDb() {
    await prisma.application.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
}

let userCounter = 0;

//cria um usuario novo e devolve o header de autorizacao pronto pra usar no inject
export async function createUserAndLogin(app: FastifyInstance) {
    const email = `user${++userCounter}@teste.com`;

    await app.inject({
        method: "POST",
        url: "/register",
        payload: { name: `User ${userCounter}`, email, password: STRONG_PASSWORD },
    });

    const login = await app.inject({
        method: "POST",
        url: "/login",
        payload: { email, password: STRONG_PASSWORD },
    });

    const { token } = login.json<{ token: string }>();
    return { email, headers: { authorization: `Bearer ${token}` } };
}

export async function createCompany(app: FastifyInstance, headers: Record<string, string>, name = "Google") {
    const res = await app.inject({ method: "POST", url: "/companies", headers, payload: { name } });
    return res.json<{ id: string; name: string; normalizedName: string }>();
}
