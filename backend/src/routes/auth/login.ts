import {prisma} from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { FastifyInstance } from "fastify";
import { loginBodySchema } from "../../schemas/auth.js";

export default async function loginUser(app: FastifyInstance) {
    app.post("/login", async (request, reply) => {
        const {email, password} = loginBodySchema.parse(request.body);

        const user = await prisma.user.findUnique({where: {email}});
        if (!user){
            return reply.status(401).send({message: "Credenciais inválidas"});
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);

        if(!validPassword){
            return reply.status(401).send({message: "Credenciais inválidas"});
        }

        const token = app.jwt.sign({sub: user.id});
        return reply.send({token});
    })
}
