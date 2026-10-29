import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { normalizeCompanyName } from "../../utils/normalizeCompanyName.js";
import { createCompanySchema } from "../../schemas/companies.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { companyResponse, errorResponse, unauthorizedResponse, validationErrorResponse, tooManyRequestsResponse } from "../../schemas/responses.js";
import { insertRateLimit } from "../../plugins/rateLimit.js";

export default async function createCompany(app:FastifyInstance){
    app.post('/companies', {
        config: { rateLimit: insertRateLimit }, //30/min por IP: freia insercao em massa
        preHandler: [app.authenticate],
        schema: {
            tags: ["Companies"],
            summary: "Cria uma empresa",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            body: toJsonSchema(createCompanySchema),
            response: {
                201: { description: "Empresa criada", ...companyResponse },
                400: validationErrorResponse,
                401: unauthorizedResponse,
                409: errorResponse("Empresa já cadastrada"),
                429: tooManyRequestsResponse,
            },
        },
    }, async (request, reply)=> {
        const {name, website} = createCompanySchema.parse(request.body);
        const {sub: userId} = request.user;

        const normalizedName = normalizeCompanyName(name);

        try{
            const company = await prisma.company.create({
                data: {userId, name, normalizedName, website},
            })
            return reply.status(201).send(company)
        } catch(error){
            if (isUniqueViolation(error)){ //@@unique([userId, normalizedName]): mesma empresa pro mesmo usuario
                return reply.status(409).send({ message: "Empresa já cadastrada" });
            }
            throw error;
        }
    })
}
