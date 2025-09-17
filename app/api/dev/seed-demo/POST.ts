export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Change this whenever I want to try a different palette:
// 'ember' | 'azure' | 'verdant' | 'amethyst'
const DEV_THEME = "amethyst" as const;

export async function POST() {
  // Hide this endpoint in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create or reuse a demo character for this user
  const character =
    (await prisma.character.findFirst({
      where: { userId, name: "Aria the Bold" },
      select: { id: true, name: true },
    })) ??
    (await prisma.character.create({
      data: {
        name: "Aria the Bold",
        userId,
        preferences: { theme: DEV_THEME } as Prisma.InputJsonValue,
        avatarUrl: "https://img-9gag-fun.9cache.com/photo/a5Kp48E_460s.jpg",
      },
      select: { id: true, name: true },
    }));

  // Create or reuse the demo action
  const existingAction = await prisma.action.findFirst({
    where: { characterId: character.id, name: "Longsword Slash" },
    select: { id: true },
  });
  if (!existingAction) {
    await prisma.action.create({
      data: {
        characterId: character.id,
        name: "Longsword Slash",
        favorite: true,
        factorsJson: {
          conditions: { wielding: "weapon", distance: "melee" },
          toHit: {
            static: 5,
            signStatic: 1,
            dice: [{ count: 1, size: 20, signDice: 1, canCrit: true }],
          },
          damage: [
            {
              type: "slashing",
              static: 3,
              signStatic: 1,
              dice: [{ count: 1, size: 8, signDice: 1 }],
            },
          ],
          favorite: true,
        },
      },
    });
  }

  // Create or reuse the demo modifier
  const existingModifier = await prisma.actionModifier.findFirst({
    where: { characterId: character.id, name: "Bless" },
    select: { id: true },
  });
  if (!existingModifier) {
    await prisma.actionModifier.create({
      data: {
        characterId: character.id,
        name: "Bless",
        favorite: false,
        factorsJson: {
          eachAttack: true,
          conditions: { spell: true },
          attackImpact: {
            static: 0,
            signStatic: 1,
            dice: [{ count: 1, size: 4, signDice: 1 }],
          },
          damage: [],
          favorite: false,
        },
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      characterId: character.id,
      hint: "Use this id for /api/characters/:id/actions and /api/characters/:id/action-modifiers",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
