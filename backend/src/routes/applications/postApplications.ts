import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import {z} from "zod";
import { applicationStatusSchema } from "../../modules/applicationStatus.js";
import { Prisma } from "../../generated/prisma/client.js";

const applicationsPostSchema = z.object({
  companyId: z.uuid(),
  roleTitle: z.string().trim().min(1).max(120),
  status: applicationStatusSchema.default("applied"),
  appliedAt: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
})

export default async function postApplications(app:FastifyInstance) {
    app.post('/applications', {preHandler: [app.authenticate]}, async (request, reply)=>{
        const {companyId, roleTitle, status, appliedAt, notes} = applicationsPostSchema.parse(request.body);

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
                include: { company: true } //mesmo formato de resposta do getApplications
            })
            return reply.status(201).send(application);
        } catch (error) {
            //P2002 = violacao do @@unique([userId, companyId, roleTitle]): mesma vaga, mesma empresa, mesmo usuario
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){
                return reply.status(409).send({message: "Candidatura já cadastrada para essa vaga"});
            }
            throw error;
        }
    })
}
