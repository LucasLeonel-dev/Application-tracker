import { Prisma } from "../generated/prisma/client.js";

//codigos de erro do Prisma: https://www.prisma.io/docs/orm/reference/error-reference
function hasPrismaCode(error: unknown, code: string) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

//P2002: violou um @unique / @@unique (registro duplicado)
export const isUniqueViolation = (error: unknown) => hasPrismaCode(error, "P2002");

//P2003: violou uma FK (ex.: apagar empresa que ainda tem candidaturas)
export const isForeignKeyViolation = (error: unknown) => hasPrismaCode(error, "P2003");

//P2025: o registro que a operacao precisava nao existe mais
export const isRecordNotFound = (error: unknown) => hasPrismaCode(error, "P2025");
