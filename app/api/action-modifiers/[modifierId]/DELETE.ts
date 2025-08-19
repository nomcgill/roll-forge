import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: Request,
  { params }: { params: { modifierId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.actionModifier.findUnique({
    where: { id: params.modifierId },
    include: { character: { select: { userId: true } } },
  });
  if (!existing || existing.character.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.actionModifier.delete({ where: { id: params.modifierId } });
  return NextResponse.json({ ok: true });
}
