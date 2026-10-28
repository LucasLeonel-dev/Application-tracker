import {prisma} from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { loginBodySchema } from "../../schemas/auth.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { errorResponse, validationErrorResponse, tooManyRequestsResponse } from "../../schemas/responses.js";
import { authRateLimit } from "../../plugins/rateLimit.js";

//hash de uma senha qualquer, com o mesmo custo (10) do register: usado quando o email nao existe,
//pra resposta demorar o mesmo que uma senha errada e o tempo nao denunciar quais emails estao cadastrados
const DUMMY_HASH = bcrypt.hashSync("senha-que-ninguem-usa", 10);

export default async function loginUser(app: FastifyInstance) {
    app.post("/login", {
        config: { rateLimit: authRateLimit }, //5/min por IP: freia forca bruta
        schema: {
            tags: ["Auth"],
            summary: "Autentica o usuário e retorna o JWT",
            body: toJsonSchema(loginBodySchema),
            response: {
                200: {
                    description: "Token JWT para usar no header Authorization: Bearer <token>",
                    type: "object",
                    properties: { token: { type: "string" } },
                    required: ["token"],
                },
                400: validationErrorResponse,
                401: errorResponse("Credenciais inválidas"),
                429: tooManyRequestsResponse,
            },
        },
    }, async (request, reply) => {
        const {email, password} = loginBodySchema.parse(request.body);

        const user = await prisma.user.findUnique({where: {email}});

        //compara sempre, mesmo sem usuario: sem isso o email inexistente responderia bem mais rapido
        const validPassword = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if(!user || !validPassword){
            return reply.status(401).send({message: "Credenciais inválidas"});
        }

        const token = app.jwt.sign({sub: user.id});
        return reply.send({token});
    })
}
