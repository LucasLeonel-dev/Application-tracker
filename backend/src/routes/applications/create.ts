import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { createApplicationSchema } from "../../schemas/applications.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";

export default async function createApplication(app:FastifyInstance) {
    app.post('/applications', {preHandler: [app.authenticate]}, async (request, reply)=>{
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
