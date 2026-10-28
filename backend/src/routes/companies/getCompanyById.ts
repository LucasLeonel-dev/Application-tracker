import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { idParamsSchema } from "../../schemas/common.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { companyResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from "../../schemas/responses.js";

export default async function getCompanyById (app:FastifyInstance){
    app.get('/companies/:id', {
        preHandler: [app.authenticate],
        schema: {
            tags: ["Companies"],
            summary: "Detalha uma empresa do usuário",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            params: toJsonSchema(idParamsSchema),
            response: {
                200: { description: "Empresa encontrada", ...companyResponse },
                400: validationErrorResponse,
                401: unauthorizedResponse,
                404: errorResponse("Empresa não encontrada"),
            },
        },
    }, async (request, reply) => {
        const {sub: userId} = request.user;
        const { id } = idParamsSchema.parse(request.params);

        const company = await prisma.company.findFirst({
            where: { id, userId }
        });

        if(!company){
            return reply.status(404).send({message: "Empresa não encontrada"})
        }

        return reply.send(company);
    })
}
