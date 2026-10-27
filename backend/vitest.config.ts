import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        globalSetup: ["tests/globalSetup.ts"], //roda 1 vez antes de tudo: aplica as migrations no banco de teste
        setupFiles: ["tests/setup.ts"], //roda antes de cada arquivo de teste: carrega o .env.test
        fileParallelism: false, //todos os arquivos usam o mesmo banco: em paralelo um apagaria os dados do outro
        server: {
            deps: {
                //o autoload carrega as rotas com import() nativo, que nao entende "./x.js" apontando pra "x.ts" (no dev quem faz isso e o tsx).
                //processando ele pelo vitest, as rotas passam pelo mesmo resolvedor dos testes e usam a mesma instancia do prisma
                inline: ["@fastify/autoload"],
            },
        },
    },
});
