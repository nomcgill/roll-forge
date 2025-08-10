import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const characters = await prisma.character.findMany({
    where: { user: { email: session.user.email } },
    select: { id: true, name: true, avatarUrl: true }, // keep payload lean + matches CharacterList
    orderBy: { name: "asc" },
  });

  return NextResponse.json(characters);
}
// This endpoint fetches characters for the authenticated user
