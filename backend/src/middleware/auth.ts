import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { request } from "node:http";

export default async function authMiddleware(app:FastifyInstance) {
    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) =>{
        try{
            await request.jwtVerify();
        }catch {
            return reply.status(401).send({message: "Token inválido ou ausente"});
        }
    })
}