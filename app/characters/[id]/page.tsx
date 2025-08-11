export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import type { ReactElement } from "react";
import CharacterDetails from "@/components/CharacterDetails";

type CharacterPageProps = {
    // Next.js may provide async params; await before using.
    params: Promise<{ id: string }>;
};

export default async function CharacterPage({ params }: CharacterPageProps): Promise<ReactElement> {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
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
