import {prisma} from "../../lib/prisma.js";
import { FastifyInstance } from "fastify";
import { idParamsSchema } from "../../schemas/common.js";
import { updateCompanySchema } from "../../schemas/companies.js";
import { normalizeCompanyName } from "../../utils/normalizeCompanyName.js";
import { isRecordNotFound, isUniqueViolation } from "../../utils/prismaErrors.js";

export default async function updateCompany(app: FastifyInstance){
    app.put('/companies/:id', {preHandler: [app.authenticate]}, async(request, reply)=>{
        const {sub: userId} = request.user;
        const {id} = idParamsSchema.parse(request.params);
        const {name, website} = updateCompanySchema.parse(request.body); //valida o body antes de consultar o banco: body invalido da 400 mesmo com id inexistente

        const existing = await prisma.company.findFirst({
            where: {id, userId}
        })

        if(!existing){
            return reply.status(404).send({message: "Empresa não encontrada"});
        }

        const normalizedName = normalizeCompanyName(name); //se so o name mudasse, o normalizedName ficaria velho e a regra de unicidade quebraria

        try {
            const company = await prisma.company.update({
                where: {id},
                data: {name, normalizedName, website: website ?? null}, //PUT: website ausente apaga o valor
            })
            return reply.send(company);
        } catch (error) {
            if (isUniqueViolation(error)){ //@@unique([userId, normalizedName]): renomeou pra uma empresa que o usuario ja tem
                return reply.status(409).send({ message: "Empresa já cadastrada" });
            }
            if (isRecordNotFound(error)){ //apagada por outra requisicao entre o findFirst e o update
                return reply.status(404).send({ message: "Empresa não encontrada" });
            }
            throw error;
        }
    })
}
