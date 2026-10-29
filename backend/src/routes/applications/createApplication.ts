import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { createApplicationSchema } from "../../schemas/applications.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { applicationResponse, errorResponse, unauthorizedResponse, validationErrorResponse, tooManyRequestsResponse } from "../../schemas/responses.js";
import { insertRateLimit } from "../../plugins/rateLimit.js";

export default async function createApplication(app:FastifyInstance) {
    app.post('/applications', {
        config: { rateLimit: insertRateLimit }, //30/min por IP: freia insercao em massa
        preHandler: [app.authenticate],
        schema: {
            tags: ["Applications"],
            summary: "Cria uma candidatura para uma empresa do usuário",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            body: toJsonSchema(createApplicationSchema),
            response: {
                201: { description: "Candidatura criada", ...applicationResponse },
                400: validationErrorResponse,
                401: unauthorizedResponse,
                404: errorResponse("Empresa não encontrada"),
                409: errorResponse("Candidatura já cadastrada para essa vaga"),
                429: tooManyRequestsResponse,
            },
        },
    }, async (request, reply)=>{
        const {companyId, roleTitle, status, appliedAt, notes} = createApplicationSchema.parse(request.body);

        const {sub: userId} = request.user;

        const company = await prisma.company.findFirst({
            where: {id: companyId, userId}
        });

        if (!company){
            return reply.status(404).send({message: "Empresa não encontrada"});
        }

        try {
            const application = await prisma.application.create({
                data: {userId, roleTitle, status, appliedAt, notes, companyId},
                include: { company: true } //mesmo formato de resposta do list
            })
            return reply.status(201).send(application);
        } catch (error) {
            //@@unique([userId, companyId, roleTitle]): mesma vaga, mesma empresa, mesmo usuario
            if (isUniqueViolation(error)){
                return reply.status(409).send({message: "Candidatura já cadastrada para essa vaga"});
            }
            throw error;
        }
    })
}
