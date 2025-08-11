export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserId } from "@/lib/session";
import type { ReactElement } from "react";
import CharacterForm from "@/components/CharacterForm";

export default async function NewCharacterPage(): Promise<ReactElement> {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
        redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/characters/new")}`);
    }

    return (
        <main className="p-4 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Create a Character</h1>
            <CharacterForm />
        </main>
    );
}
