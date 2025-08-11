export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CharacterList from "@/components/CharacterList";

export default async function CharactersPage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
        // After login, return to the list
        redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/characters")}`);
    }

    const characters = await prisma.character.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, avatarUrl: true }, // matches CharacterList props
    });

    return <CharacterList characters={characters} />;
}
