import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { companyListResponse, unauthorizedResponse } from "../../schemas/responses.js";

export default async function listCompanies(app:FastifyInstance) {
    app.get('/companies',{
        preHandler: [app.authenticate],
        schema: {
            tags: ["Companies"],
            summary: "Lista as empresas do usuário",
            security: [{ cookieAuth: [] }, { bearerAuth: [] }],
            response: {
                200: { description: "Empresas, da mais recente para a mais antiga", ...companyListResponse },
                401: unauthorizedResponse,
            },
        },
    } ,async(request, reply)=>{ //pre handler verifica se o usario é autenticado
        const {sub: userId} = request.user; // sub vem do padrão JWT, ou seja, o identificador do usuário dono do token

        const companies = await prisma.company.findMany({
            where: {userId},
            orderBy: {createdAt: "desc"},
        });

        return reply.send(companies);
    })
}
