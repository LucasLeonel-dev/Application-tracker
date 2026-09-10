import {z} from "zod"; //zod me poupa do trabalho de criar types na mao e validacao de dados do body 
import {prisma} from "../lib/prisma.js";
import bcrypt from "bcrypt"; 
import { FastifyInstance, FastifyPluginOptions } from "fastify";

const emailSchema = z.email();

const registerBodySchema = z.object({
    name: z.string().min(1),
    email: emailSchema, // por ser variavel criada por mim nao precisa do "z" para acessar
    password: z.string().min(8).regex(/[A-Z]/, "Precisa de uma letra maiúscula" ).regex(/[0-9]/, "Precisa de um número").regex(/[^A-Za-z0-9]/,"Precisa de um caractere especial"),
}); /*mesma coisa que um types criando uma interface
 para ver se os dados foram prenchidos com validacao dps*/

const loginBodySchema = z.object({
    email: emailSchema,
    password: z.string().min(1),
})

export default async function authRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {//parametro "app" puxa app= fastiy() do index
    app.post('/register', async (request, reply) => {
        const {name, email, password} = registerBodySchema.parse(request.body);

        const existingUser = await prisma.user.findUnique({where: {email}});
        if (existingUser) {
            return reply.status(409).send({message : "Email já cadastrado"});
        }

        const passwordHash = await bcrypt.hash(password,10);

        const user = await prisma.user.create({
            data: {name, email, passwordHash},
        });
        return reply.status(201).send({id: user.id, name: user.name, email: user.email})
    })

    app.post("/login", async (request, reply) => {
            const {email: email, password} = loginBodySchema.parse(request.body);
            
            const user = await prisma.user.findUnique({where: {email}});
            if (!user){
                return reply.status(401).send({message: "Credenciais inválidas"});
            }

            const validPassword = await bcrypt.compare(password, user.passwordHash);

            if(!validPassword){
                return reply.status(401).send({message: "Credencias inválidas"});
            }
            
            const token = app.jwt.sign({sub: user.id});
            return reply.send({token});

        })
}
