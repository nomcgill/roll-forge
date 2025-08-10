// app/characters/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import { prisma } from "@/lib/prisma";

import CharacterList from "@/components/CharacterList";

export default async function CharactersPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return <p className="p-4">You must be logged in to view characters.</p>;
    }

    const characters = await prisma.character.findMany({
        where: { user: { email: session.user.email } },
        select: { id: true, name: true, avatarUrl: true }, // ⬅ aligns with CharacterList type
        orderBy: { name: "asc" },
    });

    return (
        <main className="p-4 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Your Characters</h1>
            {characters.length === 0 ? (
                <p>No characters yet!</p>
            ) : (
                <CharacterList characters={characters} />
            )}
        </main>
    );
}
// This page fetches the user's characters from the database
// It checks for a valid session and displays a message if not authenticated
// It uses the CharacterList component to render the characters