import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

//precisa ser registrado antes das rotas: o swagger so documenta as rotas registradas depois dele
export default fp(async function swaggerPlugin(app: FastifyInstance) {
    await app.register(fastifySwagger, {
        openapi: {
            info: {
                title: "Application tracker",
                version: "1.0.0"
            }
        }
    })

    await app.register(fastifySwaggerUi, {
        routePrefix: '/docs',
    })
});
