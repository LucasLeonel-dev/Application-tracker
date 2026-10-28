import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";

//nome do cookie que guarda o JWT (o mesmo no login, no logout e na leitura)
export const AUTH_COOKIE = "token";

//httpOnly: o JS da pagina nao le o cookie (um XSS nao consegue roubar o token)
//sameSite lax: o navegador nao manda o cookie em POST/PUT/PATCH/DELETE disparados por outro site (protege contra CSRF)
//secure: so trafega por HTTPS; ligado so em producao porque em dev e http://localhost
export const authCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
} as const;

//tem que fazer pra exportar
export default fp(async function jwtPlugin (app: FastifyInstance) {
    await app.register(fastifyCookie); //decora request.cookies e reply.setCookie

    app.register (fastifyJwt, {
        secret: env.JWT_SECRET,
        cookie: {
            cookieName: AUTH_COOKIE, //jwtVerify procura o token nesse cookie; se vier header Authorization, ele usa o header
            signed: false, //o JWT ja e assinado, nao precisa assinar o cookie de novo
        },
        sign: {
            expiresIn: env.JWT_EXPIRES_IN,
        }
    })
})
