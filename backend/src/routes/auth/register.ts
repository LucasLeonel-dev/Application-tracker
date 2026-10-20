import {prisma} from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { registerBodySchema } from "../../schemas/auth.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";

export default async function registerUser(app: FastifyInstance) {//parametro "app" puxa app= fastiy() do app.ts
    app.post('/register', async (request, reply) => {
        const {name, email, password} = registerBodySchema.parse(request.body);

        const existingUser = await prisma.user.findUnique({where: {email}});
        if (existingUser) {
            return reply.status(409).send({message : "Email já cadastrado"});
        }

        const passwordHash = await bcrypt.hash(password,10);

        try {
            const user = await prisma.user.create({
                data: {name, email, passwordHash},
            });
            return reply.status(201).send({id: user.id, name: user.name, email: user.email})
        } catch (error) {
            //dois cadastros com o mesmo email ao mesmo tempo passam no findUnique, mas so um entra no banco
            if (isUniqueViolation(error)){
                return reply.status(409).send({message : "Email já cadastrado"});
            }
            throw error;
        }
    })
}
