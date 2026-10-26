import { z } from "zod";

//params das rotas /:id — id vazio ou fora do formato uuid cai no ZodError -> 400
export const idParamsSchema = z.object({
    id: z.uuid(),
});
