import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CharacterDetails from '@/components/CharacterDetails'

type CharacterPageProps = {
    params: Promise<{ id: string }>;
}

export default async function CharacterPage({ params }: CharacterPageProps) {
    const { id } = await params;

    const character = await prisma.character.findUnique({
        where: { id },
    });

    if (!character) {
        notFound();
    }

    return <CharacterDetails character={character} />;
}

