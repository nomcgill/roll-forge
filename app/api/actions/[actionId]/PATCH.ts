import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionCreateSchema } from "@/lib/validation/actionSchemas";

export async function PATCH(
  req: Request,
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

  const data = await req.json().catch(() => null);
  // Reuse create schema for now; later we can add a partial schema for PATCH
  const parsed = actionCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await prisma.action.update({
    where: { id: params.actionId },
    data: {
      name: parsed.data.name,
      favorite: parsed.data.favorite ?? false,
      rollDetails: parsed.data.rollDetails,
    },
  });
  return NextResponse.json({ action: updated });
}
