import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";

//tem que fazer pra exportar
export default fp(async function jwtPlugin (app: FastifyInstance) {
    app.register (fastifyJwt, {
        secret: env.JWT_SECRET,
        sign: {
            expiresIn: env.JWT_EXPIRES_IN,
        }
    })
})
