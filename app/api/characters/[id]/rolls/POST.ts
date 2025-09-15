export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { executeActionGroup, type HistoryGroup } from "@/lib/roll/engine";
import type { Tally } from "@/components/roll/types";

type Body = {
  actionTallies: Record<string, Tally>;
  perActionModifierIds: string[];
  perTurnModifierIds: string[];
};

export async function POST(
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

  const character = await prisma.character.findFirst({
    where: { id: params.id, userId },
    select: { id: true, preferences: true },
  });
  if (!character) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [actionsRaw, modifiersRaw] = await Promise.all([
    prisma.action.findMany({ where: { characterId: character.id } }),
    prisma.actionModifier.findMany({ where: { characterId: character.id } }),
  ]);

  // Execute on server using canonical data
  const group: HistoryGroup = executeActionGroup({
    actions: actionsRaw as any,
    modifiers: modifiersRaw as any,
    preferences: (character.preferences as any) ?? {},
    selection: {
      actionTallies: body.actionTallies ?? {},
      perActionModifierIds: body.perActionModifierIds ?? [],
      perTurnModifierIds: body.perTurnModifierIds ?? [],
    },
  });

  // Persist (as JSON blob to keep schema simple)
  const saved = await prisma.rollGroup.create({
    data: { characterId: character.id, data: group as any },
    select: { id: true, createdAt: true },
  });

  const createdIso = new Date(saved.createdAt).toISOString();

  const response: HistoryGroup = {
    ...group,
    id: saved.id,
    timestampIso: createdIso,
    // keep your existing label shape if engine sets one; otherwise provide a simple fallback
    timestampLabel:
      group.timestampLabel ?? new Date(saved.createdAt).toLocaleString(),
  };

  return new NextResponse(JSON.stringify(response), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
