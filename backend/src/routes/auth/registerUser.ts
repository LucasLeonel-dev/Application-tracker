import {prisma} from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { registerBodySchema } from "../../schemas/auth.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { errorResponse, validationErrorResponse } from "../../schemas/responses.js";

export default async function registerUser(app: FastifyInstance) {//parametro "app" puxa app= fastiy() do app.ts
    app.post('/register', {
        schema: {
            tags: ["Auth"],
            summary: "Cria um usuário",
            body: toJsonSchema(registerBodySchema),
            response: {
                201: {
                    description: "Usuário criado",
                    type: "object",
                    properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, email: { type: "string", format: "email" } },
                    required: ["id", "name", "email"],
                },
                400: validationErrorResponse,
                409: errorResponse("Email já cadastrado"),
            },
        },
    }, async (request, reply) => {
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
