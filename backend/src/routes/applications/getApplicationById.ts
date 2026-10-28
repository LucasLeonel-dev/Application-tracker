import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { idParamsSchema } from "../../schemas/common.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { applicationResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from "../../schemas/responses.js";

export default async function getApplicationById(app:FastifyInstance) {
    app.get('/applications/:id', {
        preHandler: [app.authenticate],
        schema: {
            tags: ["Applications"],
            summary: "Detalha uma candidatura do usuário",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            params: toJsonSchema(idParamsSchema),
            response: {
                200: { description: "Candidatura encontrada", ...applicationResponse },
                400: validationErrorResponse,
                401: unauthorizedResponse,
                404: errorResponse("Candidatura não encontrada"),
            },
        },
    }, async (request, reply)=> {
        const {sub : userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);

        const application = await prisma.application.findFirst({
            where: {id,userId},
            include: { company: true } //mesmo formato de resposta do list
        })

        if (!application){
            return reply.status(404).send({message: "Candidatura não encontrada"});
        }

        return reply.send(application);
    })
}
