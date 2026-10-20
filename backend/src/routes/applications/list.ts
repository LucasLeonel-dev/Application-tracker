import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { listApplicationsQuerySchema } from "../../schemas/applications.js";

export default async function listApplications(app:FastifyInstance) {
    app.get('/applications',{preHandler: [app.authenticate]}, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {status, companyId} =  listApplicationsQuerySchema.parse(request.query);

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
