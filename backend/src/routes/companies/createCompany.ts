import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { normalizeCompanyName } from "../../utils/normalizeCompanyName.js";
import { createCompanySchema } from "../../schemas/companies.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";

export default async function createCompany(app:FastifyInstance){
    app.post('/companies', {preHandler: [app.authenticate]}, async (request, reply)=> {
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
