//imports so pra transformar o arquivo em modulo e "abrir" as interfaces das libs (module augmentation)
import "fastify";
import "@fastify/jwt";

declare module "fastify" {
    interface FastifyInstance{
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module "@fastify/jwt"{
    interface FastifyJWT {
        user: {sub: string}, // o que request.user vai conter - (string)
        payload: { sub: string};// o que vai em app.jwt.sign() - (string)
    }
}