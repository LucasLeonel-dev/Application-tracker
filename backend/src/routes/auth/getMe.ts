import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { unauthorizedResponse, userResponse } from "../../schemas/responses.js";

export default async function getMe(app: FastifyInstance) {
    //o frontend nao consegue ler o cookie httpOnly: e por aqui que ele descobre se esta logado e quem e o usuario
    app.get('/me', {
        preHandler: [app.authenticate],
        schema: {
            tags: ["Auth"],
            summary: "Retorna o usuário logado",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            response: {
                200: { description: "Usuário dono do token", ...userResponse },
                401: unauthorizedResponse,
            },
        },
    }, async (request, reply) => {
        const {sub: userId} = request.user;

        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {id: true, name: true, email: true}, //nunca o passwordHash
        });

        //o authenticate ja garante que o usuario existe; isso so cobre ele ser apagado entre as duas consultas
        if (!user) {
            return reply.status(401).send({message: "Token inválido ou ausente"});
        }

        return reply.send(user);
    })
}
