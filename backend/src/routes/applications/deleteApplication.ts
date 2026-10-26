import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { idParamsSchema } from "../../schemas/common.js";
import { isRecordNotFound } from "../../utils/prismaErrors.js";

export default async function deleteApplication(app:FastifyInstance) {
    app.delete('/applications/:id', {preHandler: [app.authenticate]}, async (request, reply)=> {
        const {sub: userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);

        const existing = await prisma.application.findFirst({
            where: {id, userId}
        })

        if(!existing){
            return reply.status(404).send({message: "Candidatura não encontrada"});
        }

        try {
            await prisma.application.delete({
                where: {id}
            })
        } catch (error) {
            //apagada por outra requisicao entre o findFirst e o delete
            if (isRecordNotFound(error)){
                return reply.status(404).send({message: "Candidatura não encontrada"});
            }
            throw error;
        }

        return reply.status(204).send();
    })
}
