import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionCreateSchema } from "@/lib/validation/actionSchemas";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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

  const data = await req.json().catch(() => null);
  const parsed = actionCreateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const created = await prisma.action.create({
    data: {
      characterId: params.id,
      name: parsed.data.name,
      favorite: parsed.data.favorite ?? false,
      factorsJson: parsed.data.factorsJson,
    },
  });

  return NextResponse.json({ action: created }, { status: 201 });
}
