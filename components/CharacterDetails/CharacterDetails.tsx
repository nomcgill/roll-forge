import EditCharacterDropdown from "./EditCharacterDropdown";

export type CharacterDetailsProps = {
    character: {
        id: string;
        name: string;
        avatarUrl?: string | null;
        preferences?: unknown | null;
    };
};

export default function CharacterDetails({ character }: CharacterDetailsProps) {
    const hasAvatar = Boolean(character.avatarUrl);

    return (
        <section className="space-y-4" data-testid="character-details">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {hasAvatar ? (
                        <img
                            src={character.avatarUrl as string}
                            alt={`Avatar of ${character.name}`}
                            className="h-10 w-10 rounded-full object-cover"
                        />
                    ) : (
                        // Visible fallback text is unique and hidden from accessibility tree
                        <div
                            className="h-10 w-10 rounded-full bg-gray-200 grid place-items-center text-xs text-gray-600"
                            aria-hidden="true"
                            data-testid="avatar-fallback"
                        >
                            No Avatar
                        </div>
                    )}

                    <h1 className="text-2xl font-bold">{character.name}</h1>
                </div>

                {/* Compact edit UI so the page can focus on rolling */}
                <EditCharacterDropdown character={character} />
            </header>

            {/* Roll-centric UI will live here:
          - Roll templates
          - Execute roll
          - Results feed
      */}
        </section>
    );
}
