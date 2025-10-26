// components/CharacterDetails/CharacterDetails.tsx
import AvatarBadge from "./AvatarBadge";
import EditSettingsClient from "./EditSettingsClient";
import HeaderAccountLink from "@/components/HeaderAccountLink";

export type CharacterDetailsProps = {
    character: {
        id: string;
        name: string;
        avatarUrl?: string | null;
        preferences?: unknown | null;
    };
};

export default function CharacterDetails({ character }: CharacterDetailsProps) {
    return (
        <header
            className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70 border-b border-slate-800"
            data-testid="character-details"
        >
            <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-4">
                {/* Left: avatar + name + inline pencil button */}
                <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge name={character.name} avatarUrl={character.avatarUrl ?? undefined} />
                    <h1 className="text-xl md:text-2xl font-bold truncate">{character.name}</h1>

                    {/* Pencil icon trigger (smaller than name), label for a11y/tests */}
                    <EditSettingsClient
                        asInlineIcon
                        characterId={character.id}
                        initialName={character.name}
                        initialAvatarUrl={character.avatarUrl ?? ""}
                        initialPreferences={character.preferences ?? null}
                    />
                </div>

                {/* Right: account button styled like our small buttons */}
                <div className="shrink-0">
                    <HeaderAccountLink className="rounded-lg bg-slate-700/70 hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold" />
                </div>
            </div>
        </header>
    );
}
