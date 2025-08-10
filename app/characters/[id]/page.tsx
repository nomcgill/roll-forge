// app/characters/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CharacterDetails from "@/components/CharacterDetails";

type CharacterPageProps = {
    // Per the new rule, params can be async; await before use
    params: Promise<{ id: string }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
        // Use a relative callbackUrl; NextAuth will resolve it to site origin
        const callbackUrl = `/characters/${id}`;
        redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    const character = await prisma.character.findFirst({
        where: { id, userId },
    });

    if (!character) {
        notFound();
    }

    return <CharacterDetails character={character} />;
}
