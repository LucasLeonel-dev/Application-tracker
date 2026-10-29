import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

//precisa ser registrado antes das rotas: o swagger so documenta as rotas registradas depois dele
export default fp(async function swaggerPlugin(app: FastifyInstance) {
    //os `schema` das rotas servem so de documentacao: a validacao continua sendo o .parse do Zod no handler.
    //sem isso o Fastify validaria com o Ajv por conta propria (erros 400 em outro formato) e serializaria as respostas pelo schema
    app.setValidatorCompiler(() => (data) => ({ value: data }));
    app.setSerializerCompiler(() => (data) => JSON.stringify(data));

    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: "Application tracker",
                version: "1.0.0"
            },
            tags: [
                { name: "Auth", description: "Registro e login" },
                { name: "Companies", description: "Empresas do usuário logado" },
                { name: "Applications", description: "Candidaturas do usuário logado" },
            ],
            components: {
                securitySchemes: {
                    //o /docs roda na mesma origem da API: depois do POST /login aqui mesmo, o navegador ja manda o cookie sozinho
                    cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
                    bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }, //alternativa pra clientes fora do navegador (Insomnia, Postman)
                },
            },
        }
    })

    await app.register(fastifySwaggerUi, {
        routePrefix: '/docs',
    })
});
