import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { ZodError } from "zod";

//fp faz o handler valer pro app inteiro (sem fp ele so valeria dentro desse plugin)
export default fp(async function errorHandler(app: FastifyInstance) {
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

        //erros do proprio Fastify (JSON malformado, content-type invalido, body grande demais) ja trazem statusCode 4xx: sao culpa do cliente, nao 500
        const statusCode = (error as { statusCode?: unknown }).statusCode;
        if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
            return reply.status(statusCode).send({ message: "Requisição inválida" });
        }

        request.log.error(error);
        return reply.status(500).send({ message: "Erro interno no servidor" }); //lida com erros internos(prisma, bug...)
    });
});
