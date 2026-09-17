import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import {z} from "zod";

const applicationsQuerySchema = z.object({
  status: z.enum(["applied", "interview", "offer", "rejected", "withdrawn"]).optional(),
  companyId: z.string().uuid().optional(),
});


export default async function getApplications(app:FastifyInstance) {
    app.get('/applications',{preHandler: [app.authenticate]}, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {status, companyId} =  applicationsQuerySchema.parse(request.query);

        const applications = await prisma.application.findMany({
            where: {userId, ...(status && {status}), ...(companyId && {companyId})}, //O spread condicional (...(status && {...})) evita mandar status: undefined pro Prisma — embora o Prisma ignore undefined, isso deixa explícito que a chave só entra se o valor existir
            orderBy: {createdAt: "desc"},
            include: { company: true }
        })
        //não precisa verificar se não mandou nada pq volta um array vazio 
        return reply.send(applications);
    })
}