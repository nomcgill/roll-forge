import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionModifierCreateSchema } from "@/lib/validation/actionSchemas";

export async function PATCH(
  req: Request,
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

  const data = await req.json().catch(() => null);
  const parsed = actionModifierCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const updated = await prisma.actionModifier.update({
    where: { id: params.modifierId },
    data: {
      name: parsed.data.name,
      favorite: parsed.data.favorite ?? false,
      factorsJson: parsed.data.factorsJson,
    },
  });

  return NextResponse.json({ modifier: updated });
}
