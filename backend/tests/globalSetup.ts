import { execSync } from "node:child_process";
import { loadTestEnv } from "./loadTestEnv.js";

//deixa o banco de teste com o mesmo schema das migrations antes de qualquer teste
export default function setup() {
    loadTestEnv();
    try {
        execSync("npx prisma migrate deploy", { stdio: "pipe", env: process.env }); //pipe: so mostra a saida se der erro
    } catch (error) {
        const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
        throw new Error(`prisma migrate deploy falhou no banco de teste (o container do postgres esta de pe?)\n${stdout}${stderr}`);
    }
}
