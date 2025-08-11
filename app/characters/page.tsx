export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import Link from "next/link";
import CharacterList from "@/components/CharacterList";
import type { ReactElement } from "react";
import type { Character as CharacterListItem } from "@/components/CharacterList/CharacterList";

export default async function CharactersPage(): Promise<ReactElement> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
        return (
            <main className="p-4 max-w-xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold">Your Characters</h1>
                <p className="p-4 border rounded">
                    You must be logged in to view characters.{" "}
                    <Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent("/characters")}`} className="underline">
                        Sign in
                    </Link>
                    .
                </p>
            </main>
        );
    }

    const characters = await prisma.character.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, avatarUrl: true },
    });

    // Enforce the shape we pass to CharacterList at compile time
    const listItems = characters satisfies CharacterListItem[];

    return (
        <main className="p-4 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Your Characters</h1>
            {characters.length === 0 ? <p>No characters yet!</p> : <CharacterList characters={listItems} />}
        </main>
    );
}
