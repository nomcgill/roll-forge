// components/CharacterDetails/EditSettingsClient.tsx
"use client";

import { useState } from "react";
import CharacterSettingsBlock from "@/components/CharacterDetails/CharacterSettingsBlock";

type Props = {
    characterId: string;
    initialName: string;
    initialAvatarUrl: string;
    initialPreferences: unknown | null;
};

export default function EditSettingsClient(props: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="text-right">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="rounded-lg bg-slate-700/70 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold"
                aria-label="Edit Character"
                aria-expanded={open}
            >
                {open ? "Close Settings" : "Edit Settings"}
            </button>

            {open && (
                <div className="mt-3">
                    <CharacterSettingsBlock
                        characterId={props.characterId}
                        initialName={props.initialName}
                        initialAvatarUrl={props.initialAvatarUrl}
                        initialPreferences={props.initialPreferences}
                        onSaved={() => setOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
