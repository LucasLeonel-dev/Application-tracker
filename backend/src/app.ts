import fastify from "fastify";
import cors from "@fastify/cors";
import autoload from "@fastify/autoload";
import path from "node:path";
import errorHandler from "./plugins/errorHandler.js";
import jwtPlugin from "./plugins/jwt.js";
import authenticate from "./plugins/authenticate.js";
import swaggerPlugin from "./plugins/swagger.js";

//so monta o app, sem dar listen: assim os testes podem usar app.inject() sem abrir porta
export function buildApp() {
    const app = fastify();

    app.register(cors, {origin: "*"});
    app.register(errorHandler);
    app.register(jwtPlugin);
    app.register(authenticate);
    app.register(swaggerPlugin); //antes do autoload

    app.register(autoload, {
        dir:path.join(import.meta.dirname, "routes"),
        dirNameRoutePrefix: false, //sem isso o nome da pasta vira prefixo e a rota fica /applications/applications
        routeParams: true
    });

    app.get('/', () => {
        return "rota raiz"
    })

    app.get('/health', ()=> {
        return { status: "ok" }
    } ) //usado pra checar se o servidor esta de pe

    return app;
}
