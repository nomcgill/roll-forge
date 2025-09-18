// components/CharacterDetails/CharacterDetails.tsx
import AvatarBadge from '@/components/CharacterDetails/AvatarBadge';
import EditSettingsClient from '@/components/CharacterDetails/EditSettingsClient';

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
        <section className="space-y-4" data-testid="character-details">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <AvatarBadge name={character.name} avatarUrl={character.avatarUrl ?? undefined} />
                    <h1 className="text-2xl font-bold">{character.name}</h1>
                </div>

                {/* Button that reveals the inline settings form (client-only) */}
                <EditSettingsClient
                    characterId={character.id}
                    initialName={character.name}
                    initialAvatarUrl={character.avatarUrl ?? ""}
                    initialPreferences={character.preferences ?? null}
                />
            </header>
        </section>
    );
}
