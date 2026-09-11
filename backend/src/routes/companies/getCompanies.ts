import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";

export default async function getCompanies(app:FastifyInstance) {
    app.get('/companies',{preHandler: [app.authenticate]} ,async(request, reply)=>{ //pre handler verifica se o usario é autenticado
        const {sub: userId} = request.user; // sub vem do padrão JWT, ou seja, o identificador do usuário dono do token
        

        const companies = await prisma.company.findMany({
            where: {userId},
            orderBy: {createdAt: "desc"},
        });
        return reply.send(companies);
    })
}