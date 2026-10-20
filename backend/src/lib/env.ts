import "dotenv/config";
import { z } from "zod";

//valida as variaveis no boot: se faltar alguma, o servidor nem sobe (melhor que quebrar so na hora do login)
const envSchema = z.object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres"),
    JWT_EXPIRES_IN: z.string().min(1).default("1d"), //sem isso o token nunca expiraria
});

export const env = envSchema.parse(process.env);
