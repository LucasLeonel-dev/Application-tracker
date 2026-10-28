import {prisma} from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { loginBodySchema } from "../../schemas/auth.js";
import { toJsonSchema } from "../../utils/toJsonSchema.js";
import { errorResponse, validationErrorResponse, tooManyRequestsResponse, userResponse } from "../../schemas/responses.js";
import { authRateLimit } from "../../plugins/rateLimit.js";
import { AUTH_COOKIE, authCookieOptions } from "../../plugins/jwt.js";

//hash de uma senha qualquer, com o mesmo custo (10) do register: usado quando o email nao existe,
//pra resposta demorar o mesmo que uma senha errada e o tempo nao denunciar quais emails estao cadastrados
const DUMMY_HASH = bcrypt.hashSync("senha-que-ninguem-usa", 10);

export default async function loginUser(app: FastifyInstance) {
    app.post("/login", {
        config: { rateLimit: authRateLimit }, //5/min por IP: freia forca bruta
        schema: {
            tags: ["Auth"],
            summary: "Autentica o usuário e grava o JWT no cookie httpOnly `token`",
            body: toJsonSchema(loginBodySchema),
            response: {
                200: {
                    description: "Usuário autenticado. O JWT não vem no corpo: vai no header Set-Cookie (httpOnly), e o navegador o reenvia sozinho",
                    ...userResponse,
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
        const { exp } = app.jwt.decode<{ exp: number }>(token)!; //o cookie expira junto com o JWT (exp vem em segundos)

        return reply
            .setCookie(AUTH_COOKIE, token, { ...authCookieOptions, expires: new Date(exp * 1000) })
            .send({id: user.id, name: user.name, email: user.email}); //token fora do corpo: o JS do frontend nunca o ve
    })
}
