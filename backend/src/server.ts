import { buildApp } from "./app.js";

const app = buildApp();

await app.listen({port: 3333}).then(() => { //quando rodar ent...
    console.log("HTTP server running!")
})
