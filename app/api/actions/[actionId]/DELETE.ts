import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: Request,
  { params }: { params: { actionId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.action.findUnique({
    where: { id: params.actionId },
    include: { character: { select: { userId: true } } },
  });
  if (!existing || existing.character.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.action.delete({ where: { id: params.actionId } });
  return NextResponse.json({ ok: true });
}
