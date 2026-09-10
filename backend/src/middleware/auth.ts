import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default fp(async function authMiddleware(app:FastifyInstance) { //injetando decorador em app, mas o fastify nao sabe disso, ent quando eu usar ele em outro arq como pre handler vai acusar erro de tipagem ("Property 'authenticate' does not exist on type 'FastifyInstance")
    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) =>{
        try{
            await request.jwtVerify(); //valida e joga o payload em request.user
        }catch {
            return reply.status(401).send({message: "Token inválido ou ausente"}); //mensagem auto-explicativa
        }
    })
});