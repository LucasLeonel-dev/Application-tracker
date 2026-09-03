import { promises } from "node:dns";

declare module "fastify" {
    interface FastifyInstance{
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module "@fastify/jwt"{
    interface FastifyJWT {
        user: {sub: string}, // o que request.user vai conter
        payload: { sub: string};// o que vai em app.jwt.sign(
    }
}