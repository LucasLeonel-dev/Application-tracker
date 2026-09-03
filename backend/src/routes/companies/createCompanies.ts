import {z} from "zod"; //zod me poupa do trabalho de criar types na mao e validacao de dados do body 
import {prisma} from "../lib/prisma.js";
import { Prisma } from "../../generated/prisma/index.js";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { normalizeCompanyName } from "./normalizeCompanyName.js";

const companiesBodySchema = z.object({
    name: z.string().min(1),
    website: z.string().optional(),
})

export default async function createCompanies(app:FastifyInstance, opts: FastifyPluginOptions){
    app.post('/companies', async (request, reply)=> {
        const {name, website} = companiesBodySchema.parse(request.body);

    const normalizedName = normalizeCompanyName(name); 
    const existingCompanie = await prisma.company.findUnique({where: {normalizedName}})
    if (existingCompanie){
        return reply.status(409).send({message: "Compania já existente!"});
    }
    try{
        const company = await prisma.company.create({
            data: {userId, name, normalizedName, website},
        })
        return reply.status(201).send(company)
    } catch(error){
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){
            return reply.status(409).send({ message: "Empresa já cadastrada" });
        }
         throw error;
    }
    })
}