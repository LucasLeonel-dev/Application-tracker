import { z } from "zod";

export const createCompanySchema = z.object({
    name: z.string().trim().min(1).max(120),
    website: z.url().optional(), //so aceita url valida (ex.: https://empresa.com)
});
