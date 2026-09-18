import { z } from "zod";

//fonte unica do status: usado no filtro do GET e no body do POST.
//pra não ter que ficar recriando em cada arquivo que precisar do status no zod de verificação 
export const applicationStatusSchema = z.enum([
    "applied",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
]);
