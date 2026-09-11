import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";

export default async function getCompanies(app:FastifyInstance) {
    app.get('/companies',{preHandler: [app.authenticate]} ,async(request, reply)=>{ //pre handler verifica se o usario é autenticado
        const {sub: userId} = request.user;

        const companies = await prisma.company.findMany({
            where: {userId},
            orderBy: {createdAt: "desc"},
        });
        return reply.send(companies);
    })
}