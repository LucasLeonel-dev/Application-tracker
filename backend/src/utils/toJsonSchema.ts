import { z } from "zod";

//converte um schema Zod em JSON Schema (OpenAPI 3.0) so pra alimentar o Swagger: quem valida de verdade continua sendo o .parse no handler
//io "input" = o que a rota recebe (ex.: coerce.date aceita string); "output" = o que ela devolve
export function toJsonSchema(schema: z.ZodType, io: "input" | "output" = "input") {
    return z.toJSONSchema(schema, {
        target: "openapi-3.0",
        io,
        unrepresentable: "any", //z.coerce.date() nao tem equivalente em JSON Schema; sem isso o toJSONSchema lanca erro
        override: (ctx) => {
            if (ctx.zodSchema._zod.def.type === "date") { //no JSON a data viaja como string ISO
                ctx.jsonSchema.type = "string";
                ctx.jsonSchema.format = "date-time";
            }
            if (ctx.jsonSchema.format === "uuid" || ctx.jsonSchema.format === "date-time") {
                delete ctx.jsonSchema.pattern; //o zod gera uma regex enorme que so polui a doc; o format ja diz tudo
            }
        },
    });
}
