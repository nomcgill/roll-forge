import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await prisma.character.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.character.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, id: params.id }, { status: 200 });
}
// This endpoint deletes a character by ID for the authenticated user
// It checks for a valid session and returns a 401 if not authenticated
// If the character is not found or does not belong to the user, it returns a 404
// On successful deletion, it returns a 204 status with the character ID
