import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { idParamsSchema } from "../../schemas/common.js";
import { isForeignKeyViolation, isRecordNotFound } from "../../utils/prismaErrors.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { errorResponse, unauthorizedResponse, validationErrorResponse } from "../../schemas/responses.js";

export default async function deleteCompany(app: FastifyInstance){
    app.delete('/companies/:id', {
        preHandler: [app.authenticate],
        schema: {
            tags: ["Companies"],
            summary: "Remove uma empresa sem candidaturas vinculadas",
            security: [{ bearerAuth: [] }],
            params: toJsonSchema(idParamsSchema),
            response: {
                204: { description: "Empresa removida", type: "null" },
                400: validationErrorResponse,
                401: unauthorizedResponse,
                404: errorResponse("Empresa não encontrada"),
                409: errorResponse("Existem candidaturas vinculadas a esta empresa"),
            },
        },
    }, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);

        const company = await prisma.company.findFirst({
            where: {userId, id}
        })

        if(!company){
            return reply.status(404).send({message: "Empresa não encontrada"}); // return serve para o codigo nao continuar ja que ja deu o reply de algo
        }

        try {
            await prisma.company.delete({
                where: {id}
            })
        } catch (error) {
            if (isRecordNotFound(error)) {
                return reply.status(404).send({ message: "Empresa não encontrada" });
            }
            if (isForeignKeyViolation(error)) {
                return reply.status(409).send({
                    message: "Não é possível excluir: existem candidaturas vinculadas a esta empresa"
                });
            }
            throw error;
        }
        return reply.status(204).send();
    })
}
