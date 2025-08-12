export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { z } from "zod";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const JsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue), // key + value schemas
  ])
);

const CharacterUpdateSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    // "" -> null; valid URL stays string; undefined = "do not change"
    avatarUrl: z
      .preprocess(
        (v) => (v === "" ? null : v),
        z.union([z.string().url("Invalid URL"), z.null()])
      )
      .optional(),
    preferences: z.union([JsonValue, z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = CharacterUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Ownership check
  const exists = await prisma.character.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if ("name" in data) updateData.name = data.name;
  if ("avatarUrl" in data) updateData.avatarUrl = data.avatarUrl; // string | null
  if ("preferences" in data) updateData.preferences = data.preferences; // Json | null

  const updated = await prisma.character.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      preferences: true,
      userId: true,
    },
  });

  return new NextResponse(JSON.stringify(updated), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
