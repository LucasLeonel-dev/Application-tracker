import dotenv from "dotenv";

//override: o .env.test vence o .env (o lib/env.ts carrega o .env depois, mas sem sobrescrever o que ja existe)
export function loadTestEnv() {
    dotenv.config({ path: ".env.test", override: true, quiet: true });

    //trava de seguranca: os testes apagam as tabelas, nunca podem rodar no banco de dev
    if (!process.env.DATABASE_URL?.includes("_test")) {
        throw new Error("DATABASE_URL dos testes precisa apontar para um banco *_test (confira o .env.test)");
    }
}
