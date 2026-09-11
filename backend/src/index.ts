import fastify from "fastify";
import cors from "@fastify/cors";
import autoload from "@fastify/autoload";
import path from "node:path";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import jwtPlugin from "./plugins/jwt.js";
import authMiddleware from "./middleware/auth.js";

const app = fastify();
app.register(cors, {origin: "*"});

app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) { //para lidar com erros de digitacao dentro do zod, convertendo o erro padrao do zod para esse tipo de erro
        return reply.status(400).send({
            message: "Dados inválidos", //mensagem de erro 
            issues: error.issues.map((issue) => ({ //mapeia erro
                path: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Erro interno no servidor" }); //lida com erros internos(prisma, bug...)
});

app.register(jwtPlugin);
app.register(authMiddleware);

app.register(autoload, {
    dir:path.join(import.meta.dirname, "routes"),
    routeParams: true
});

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: "Application tracker",
            version: "1.0.0"
        }
    }
})

app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
})

app.get('/', () => {
    return "rota raiz"
})

app.get('/health', ()=> {
    return 'Hello NLW'
} ) //endereco health vai mandar hello nlw para tela
//cada rota devera realizar alguma operacao 

await app.listen({port: 3333}).then(() => { //quando rodar ent...
    console.log("HTTP server running!")
})
