import { z } from "zod";

//fonte unica do status: usado no filtro do GET e no body do POST/PATCH.
//pra não ter que ficar recriando em cada arquivo que precisar do status no zod de verificação
export const applicationStatusSchema = z.enum([
    "applied",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
]);

//campos comuns entre criar e editar
const applicationFields = {
    roleTitle: z.string().trim().min(1).max(120),
    appliedAt: z.coerce.date(),
};

export const createApplicationSchema = z.object({
    ...applicationFields,
    companyId: z.uuid(),
    status: applicationStatusSchema.default("applied"),
    notes: z.string().trim().max(1000).optional(),
});

//sem .default no status: se o campo nao vier, o valor atual e mantido (PATCH = edicao parcial)
export const updateApplicationSchema = z.object({
    ...applicationFields,
    status: applicationStatusSchema,
    notes: z.string().trim().max(1000).nullable(), //null apaga a anotacao
}).partial().refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para editar",
});

export const listApplicationsQuerySchema = z.object({
    status: applicationStatusSchema.optional(),
    companyId: z.uuid().optional(),
});
