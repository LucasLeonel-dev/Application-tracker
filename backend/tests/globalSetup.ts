import { execSync } from "node:child_process";
import { loadTestEnv } from "./loadTestEnv.js";

//deixa o banco de teste com o mesmo schema das migrations antes de qualquer teste
export default function setup() {
    loadTestEnv();
    execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
