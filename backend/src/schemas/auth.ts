import { z } from "zod"; //zod me poupa do trabalho de criar types na mao e validacao de dados do body

const emailSchema = z.email();

export const registerBodySchema = z.object({
    name: z.string().min(1),
    email: emailSchema, // por ser variavel criada por mim nao precisa do "z" para acessar
    password: z.string().min(8).regex(/[A-Z]/, "Precisa de uma letra maiúscula" ).regex(/[0-9]/, "Precisa de um número").regex(/[^A-Za-z0-9]/,"Precisa de um caractere especial"),
}); /*mesma coisa que um types criando uma interface
 para ver se os dados foram prenchidos com validacao dps*/

export const loginBodySchema = z.object({
    email: emailSchema,
    password: z.string().min(1),
});
