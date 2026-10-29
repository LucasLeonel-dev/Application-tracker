import { FastifyInstance } from "fastify";
import { AUTH_COOKIE, authCookieOptions } from "../../plugins/jwt.js";

export default async function logoutUser(app: FastifyInstance) {
    //sem app.authenticate de proposito: sair tem que funcionar mesmo com o token ja expirado
    app.post('/logout', {
        schema: {
            tags: ["Auth"],
            summary: "Encerra a sessão apagando o cookie do JWT",
            response: {
                204: { description: "Cookie apagado", type: "null" },
            },
        },
    }, async (_request, reply) => {
        //o JS do frontend nao consegue apagar um cookie httpOnly: quem apaga e o servidor.
        //as opcoes (path, sameSite...) precisam ser as mesmas do login, senao o navegador trata como outro cookie
        return reply.clearCookie(AUTH_COOKIE, authCookieOptions).status(204).send();
    })
}
