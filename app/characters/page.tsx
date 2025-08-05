import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

import CharacterList from '@/components/CharacterList'

export default async function CharactersPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return <p className="p-4">You must be logged in to view characters.</p>;
    }

    const characters = await prisma.character.findMany({
        where: {
            user: {
                email: session.user.email,
            },
        },
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