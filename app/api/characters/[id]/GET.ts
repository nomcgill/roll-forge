import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const character = await prisma.character.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(character, { status: 200 });
}
// This endpoint fetches a single character by ID for the authenticated user
// It checks for a valid session and returns a 401 if not authenticated
// If the character is not found, it returns a 404
// Otherwise, it returns the character data with a 200 status
