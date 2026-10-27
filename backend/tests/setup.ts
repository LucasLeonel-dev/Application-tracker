import { loadTestEnv } from "./loadTestEnv.js";

//precisa rodar antes de qualquer import de src/: o lib/env.ts e o lib/prisma.ts leem o DATABASE_URL na hora do import
loadTestEnv();
