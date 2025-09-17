import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThemeNameSchema } from "@/lib/validation/theme";
import type { Prisma } from "@prisma/client";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = ThemeNameSchema.safeParse(body?.theme);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }
  const theme = parsed.data;

  // Ensure ownership
  const existing = await prisma.character.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, preferences: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Merge into existing JSON prefs (object-only)
  let base: Record<string, unknown> = {};
  const prefs = existing.preferences as unknown;
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    base = { ...(prefs as Record<string, unknown>) };
  }
  const nextPrefs = { ...base, theme } as Record<string, unknown>;

  const updated = await prisma.character.update({
    where: { id: existing.id },
    data: { preferences: nextPrefs as unknown as Prisma.InputJsonValue },
    select: { id: true, preferences: true },
  });

  return NextResponse.json(updated);
}
