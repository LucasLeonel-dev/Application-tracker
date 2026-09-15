import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { Prisma } from "../../generated/prisma/client.js";

export default async function deleteCompany(app: FastifyInstance){
    app.delete('/companies/:id', {preHandler: [app.authenticate]}, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {id} = request.params as {id: string};
        
        const company = await prisma.company.findFirst({
            where: {userId, id}
        })

        if(!company){
            return reply.status(404).send({message: "Empresa não encontrada"}); // return serve para o codigo nao continuar ja que ja deu o reply de algo 
        }

        try {
            await prisma.company.delete({
                where: {id}
            })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    return reply.status(404).send({ message: "Empresa não encontrada" });
                }
                if (error.code === "P2003") {
                    return reply.status(409).send({
                        message: "Não é possível excluir: existem candidaturas vinculadas a esta empresa"
                    });
                }
            }
            throw error;
        }
        return reply.status(204).send();
    })
} 