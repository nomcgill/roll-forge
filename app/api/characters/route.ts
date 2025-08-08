import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

interface CharacterRequestBody {
  name: string;
  avatarUrl?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CharacterRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, avatarUrl } = body;

  try {
    const newCharacter = await prisma.character.create({
      data: {
        name,
        avatarUrl,
        user: {
          connect: { email: session.user.email },
        },
      },
    });
    return NextResponse.json(newCharacter);
  } catch (error) {
    console.error("Character creation error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
