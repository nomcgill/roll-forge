export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { z } from "zod";

// Empty string -> undefined (so .url().optional() can validate), then null out for DB
const CharacterCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  avatarUrl: z
    .preprocess((v) => (v === "" ? undefined : v), z.string().url().optional())
    .transform((v) => v ?? null),
});
export type CharacterCreateInput = z.infer<typeof CharacterCreateSchema>;

export async function POST(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = CharacterCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { name, avatarUrl } = parsed.data;

  const created = await prisma.character.create({
    data: { name, avatarUrl, userId },
    select: { id: true, name: true, avatarUrl: true, userId: true },
  });

  const location = `/characters/${created.id}`;
  return new NextResponse(JSON.stringify(created), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Location: location,
    },
  });
}
