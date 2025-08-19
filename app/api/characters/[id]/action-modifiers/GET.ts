import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const character = await prisma.character.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!character || character.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const modifiers = await prisma.actionModifier.findMany({
    where: { characterId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ modifiers });
}
