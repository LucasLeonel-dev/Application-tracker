import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export default fp(async function authMiddleware(app:FastifyInstance) { //injetando decorador em app, mas o fastify nao sabe disso, ent quando eu usar ele em outro arq como pre handler vai acusar erro de tipagem ("Property 'authenticate' does not exist on type 'FastifyInstance")
    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) =>{
        try{
            await request.jwtVerify(); //valida e joga o payload em request.user
        }catch {
            return reply.status(401).send({message: "Token inválido ou ausente"}); //mensagem auto-explicativa
        }

        //o token continua valido ate expirar mesmo se o usuario for apagado: sem essa checagem os POST quebrariam na FK (500).
        //fica fora do try de proposito: erro de banco aqui e 500 de verdade, nao "token invalido"
        const user = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { id: true } });
        if (!user) {
            return reply.status(401).send({message: "Token inválido ou ausente"});
        }
    })
});