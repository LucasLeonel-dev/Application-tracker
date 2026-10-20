import { FastifyInstance } from "fastify";
import {prisma} from "../../lib/prisma.js";
import { idParamsSchema } from "../../schemas/common.js";

export default async function getApplicationById(app:FastifyInstance) {
    app.get('/applications/:id', {preHandler: [app.authenticate]}, async (request, reply)=> {
        const {sub : userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);

        const application = await prisma.application.findFirst({
            where: {id,userId},
            include: { company: true } //mesmo formato de resposta do list
        })

        if (!application){
            return reply.status(404).send({message: "Candidatura não encontrada"});
        }

        return reply.send(application);
    })
}
