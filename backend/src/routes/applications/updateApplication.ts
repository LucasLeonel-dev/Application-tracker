import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { idParamsSchema } from "../../schemas/common.js";
import { updateApplicationSchema } from "../../schemas/applications.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";

export default async function updateApplication(app:FastifyInstance) {
    app.patch('/applications/:id', {preHandler: [app.authenticate]}, async (request, reply)=> {
        const {sub: userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);
        const data = updateApplicationSchema.parse(request.body); //valida o body antes de consultar o banco: body invalido da 400 mesmo com id inexistente

        const existing = await prisma.application.findFirst({
            where: {userId, id}
        })

        if(!existing){
            return reply.status(404).send({message: "Candidatura não encontrada"});
        }

        try {
            const application = await prisma.application.update({
                where: {id},
                data,
                include: { company: true } //mesmo formato de resposta do list
            })
            return reply.send(application);
        } catch (error) {
            //renomeou o roleTitle pra uma vaga que ja existe nessa empresa
            if (isUniqueViolation(error)){
                return reply.status(409).send({message: "Candidatura já cadastrada para essa vaga"});
            }
            throw error;
        }
    })
}
