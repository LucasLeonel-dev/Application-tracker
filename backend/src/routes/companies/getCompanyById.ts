import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";

export default async function getCompanyById (app:FastifyInstance){
    app.get('/companies/:id', {preHandler: [app.authenticate]}, async (request, reply) => {
        const {sub: userId} = request.user;
        const { id } = request.params as {id: string};

        if(!id || id.trim() === ""){ //nao digitou nada ou tacou so um espaco e fds, .trim so roda se tiver algo nao null ou undefinied
            return reply.status(400).send({ message: "Informe uma compania válida" });
        }

        const company = await prisma.company.findFirst({
            where: { id, userId }
        });

        if(!company){
            return reply.status(404).send({message: "Empresa não encontrada"})
        }

        return reply.send(company);
    })
}