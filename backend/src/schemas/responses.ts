import { z } from "zod";
import { toJsonSchema } from "../utils/toJsonSchema.js";
import { applicationStatusSchema } from "./applications.js";

//schemas Zod so pra descrever as respostas na doc: nunca passam por .parse, a rota devolve direto o que o Prisma retorna
const companyResponseSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    normalizedName: z.string(),
    website: z.string().nullable(),
    createdAt: z.iso.datetime(),
});

const applicationResponseSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    companyId: z.uuid(),
    roleTitle: z.string(),
    status: applicationStatusSchema,
    appliedAt: z.iso.datetime(),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    company: companyResponseSchema, //todas as rotas de applications usam include: { company: true }
});

export const companyResponse = toJsonSchema(companyResponseSchema, "output");
export const companyListResponse = { type: "array", items: companyResponse } as const;
export const applicationResponse = toJsonSchema(applicationResponseSchema, "output");
export const applicationListResponse = { type: "array", items: applicationResponse } as const;

//erro padrao das rotas: { message }
export const errorResponse = (description: string) => ({
    description,
    type: "object",
    properties: { message: { type: "string" } },
    required: ["message"],
}) as const;

//400 do ZodError, no formato montado pelo errorHandler
export const validationErrorResponse = {
    description: "Dados inválidos",
    type: "object",
    properties: {
        message: { type: "string" },
        issues: {
            type: "array",
            items: {
                type: "object",
                properties: { path: { type: "string" }, message: { type: "string" } },
                required: ["path", "message"],
            },
        },
    },
    required: ["message", "issues"],
} as const;

export const unauthorizedResponse = errorResponse("Token inválido ou ausente");
