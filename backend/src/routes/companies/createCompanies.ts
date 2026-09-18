import {z} from "zod"; //zod me poupa do trabalho de criar types na mao e validacao de dados do body 
import {prisma} from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { FastifyInstance } from "fastify";
import { normalizeCompanyName } from "../../modules/normalizeCompanyName.js";

const companiesBodySchema = z.object({
    name: z.string().min(1),
    website: z.string().optional(),
})

export default async function createCompanies(app:FastifyInstance){
    app.post('/companies', {preHandler: [app.authenticate]}, async (request, reply)=> {
    const {name, website} = companiesBodySchema.parse(request.body);
    const {sub: userId} = request.user;

    const normalizedName = normalizeCompanyName(name); 

    try{
        const company = await prisma.company.create({
            data: {userId, name, normalizedName, website},
        })
        return reply.status(201).send(company)
    } catch(error){
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"){ //mesmo caso do handler global, substitui o erro do prisma ou p2002{tambem erro do prisma}, pela messagem ai  
            return reply.status(409).send({ message: "Empresa já cadastrada" });
        }
         throw error;
    }
    })
}