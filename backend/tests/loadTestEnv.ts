import dotenv from "dotenv";

//override: o .env.test vence o .env (o lib/env.ts carrega o .env depois, mas sem sobrescrever o que ja existe)
export function loadTestEnv() {
    dotenv.config({ path: ".env.test", override: true, quiet: true });

    //trava de seguranca: os testes apagam as tabelas, nunca podem rodar no banco de dev.
    //confere o NOME do banco (pathname), nao a URL inteira: "?schema=x_test" num banco de dev nao pode passar
    const dbName = new URL(process.env.DATABASE_URL ?? "postgresql://invalida").pathname.slice(1);
    if (!dbName.endsWith("_test")) {
        throw new Error(`DATABASE_URL dos testes precisa apontar para um banco *_test, veio "${dbName}" (confira o .env.test)`);
    }
}
