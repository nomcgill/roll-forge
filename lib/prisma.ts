import { PrismaClient } from "@prisma/client";
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? new PrismaClient();

prisma.$use(async (params, next) => {
  const result = await next(params);

  const strip = (obj: any) => {
    if (obj && typeof obj === "object") delete obj.passwordHash;
    return obj;
  };

  if (Array.isArray(result)) return result.map(strip);
  return strip(result);
});

// prevent hot-reloading from creating new clients
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
