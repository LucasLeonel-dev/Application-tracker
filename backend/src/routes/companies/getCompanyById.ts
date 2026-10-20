import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { idParamsSchema } from "../../schemas/common.js";

export default async function getCompanyById (app:FastifyInstance){
    app.get('/companies/:id', {preHandler: [app.authenticate]}, async (request, reply) => {
        const {sub: userId} = request.user;
        const { id } = idParamsSchema.parse(request.params);

        const company = await prisma.company.findFirst({
            where: { id, userId }
        });

        if(!company){
            return reply.status(404).send({message: "Empresa não encontrada"})
        }

        return reply.send(company);
    })
}
