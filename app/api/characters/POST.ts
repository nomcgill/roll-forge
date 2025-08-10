// app/api/characters/POST.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Body = {
  name?: string;
  avatarUrl?: string | null;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const avatarUrl =
    typeof body.avatarUrl === "string" && body.avatarUrl.trim().length > 0
      ? body.avatarUrl.trim()
      : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const created = await prisma.character.create({
    data: {
      name,
      avatarUrl,
      userId: user.id,
    },
    select: { id: true, name: true, avatarUrl: true },
  });

  return NextResponse.json(created, { status: 201 });
}
// This endpoint creates a new character for the authenticated user
// It checks for a valid session and returns a 401 if not authenticated
// It validates the request body and returns a 400 if invalid
// On success, it returns the created character with a 201 status
