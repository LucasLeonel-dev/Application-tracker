import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import {z} from "zod";
import { applicationStatusSchema } from "../../modules/applicationStatus.js";

const applicationsQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  companyId: z.uuid().optional(),
});

export default async function getApplications(app:FastifyInstance) {
    app.get('/applications',{preHandler: [app.authenticate]}, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {status, companyId} =  applicationsQuerySchema.parse(request.query);

        const applications = await prisma.application.findMany({
            where: {userId, ...(status && {status}), ...(companyId && {companyId})}, /*O spread condicional (...(status && {...}))
             evita mandar status: undefined pro Prisma, embora o Prisma ignore undefined,
             isso deixa explícito que a chave só entra se o valor existir */
            orderBy: {createdAt: "desc"},
            include: { company: true } //traz a companhia da aplicação junto
        })
        //não precisa verificar se não mandou nada, pq volta um array vazio 
        return reply.send(applications);
    })
}