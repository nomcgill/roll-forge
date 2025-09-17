// app/characters/[id]/page.tsx
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
import RollWorkspace from "@/components/roll/RollWorkspace";
import ThemeScope from '@/components/ThemeScope/ThemeScope';
import { readThemeFromPreferences, type ThemeName } from '@/lib/validation/theme';
import CharacterThemePicker from "@/components/CharacterThemePicker";


import {
    actionCreateSchema,
    actionModifierCreateSchema,
} from "@/lib/validation/actionSchemas";
import type {
    ActionFactorsType,
    ActionModifierFactorsType,
} from "@/lib/validation/actionSchemas";
import type {
    ActionRecord,
    ModifierRecord,
} from "@/components/roll/types";

type CharacterPageProps = {
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
        select: { id: true, name: true, avatarUrl: true, userId: true, preferences: true },
    });
    if (!character) {
        notFound();
    }

    const theme: ThemeName = readThemeFromPreferences(character?.preferences);
    console.log(character)

    // Read from Prisma
    const [actionsRaw, modifiersRaw] = await Promise.all([
        prisma.action.findMany({
            where: { characterId: id },
            select: {
                id: true,
                characterId: true,
                name: true,
                favorite: true,
                factorsJson: true,
                createdAt: true,
            },
            orderBy: [{ favorite: "desc" }, { name: "asc" }],
        }),
        prisma.actionModifier.findMany({
            where: { characterId: id },
            select: {
                id: true,
                characterId: true,
                name: true,
                favorite: true,
                factorsJson: true,
                createdAt: true,
            },
            orderBy: [{ favorite: "desc" }, { name: "asc" }],
        }),
    ]);

    // Normalize JSON with Zod → concrete UI types
    const actions: ActionRecord[] = actionsRaw.map((a) => ({
        ...a,
        factorsJson: actionCreateSchema.shape.factorsJson.parse(a.factorsJson) as ActionFactorsType,
    }));

    const modifiers: ModifierRecord[] = modifiersRaw.map((m) => ({
        ...m,
        factorsJson: actionModifierCreateSchema.shape.factorsJson.parse(m.factorsJson) as ActionModifierFactorsType,
    }));

    return (
        <ThemeScope theme={theme} id="theme-scope" className="min-h-screen bg-surface">
            <main className="px-4 py-4 md:px-6 lg:px-8 space-y-6">
                <CharacterDetails character={character} />
                <CharacterThemePicker characterId={id} currentTheme={theme} scopeId="theme-scope" />
                <RollWorkspace
                    characterId={id}
                    preferences={character.preferences as any}
                    initialActions={actions}
                    initialModifiers={modifiers}
                />
            </main>
        </ThemeScope>
    );
}
