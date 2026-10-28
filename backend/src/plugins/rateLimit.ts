import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";

//limites por IP; cada rota que usa um deles tem o proprio contador
//auth: freia tentativa de adivinhar senha (forca bruta) e criacao de contas em massa
export const authRateLimit = { max: 5, timeWindow: "1 minute" };
//insercoes no banco: freia script inserindo empresas/candidaturas em loop
export const insertRateLimit = { max: 30, timeWindow: "1 minute" };

//global: false -> so limita as rotas que pedirem com config: { rateLimit: ... }
//o 429 cai no errorHandler global, que monta a mensagem
export default fp(async function rateLimitPlugin(app: FastifyInstance) {
    await app.register(fastifyRateLimit, { global: false });
});
