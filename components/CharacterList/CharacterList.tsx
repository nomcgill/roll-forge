'use client';

export type Character = {
    id: string;
    name: string;
    avatarUrl?: string | null;
};

type Props = {
    characters: Character[];
};

export default function CharacterList({ characters }: Props) {
    if (characters.length === 0) {
        return <p>No characters yet!</p>;
    }

    return (
        <ul className="space-y-2">
            {characters.map((character) => (
                <li key={character.id} className="border rounded p-2">
                    <p className="font-semibold">{character.name}</p>
                    {character.avatarUrl && (
                        <img
                            src={character.avatarUrl}
                            alt={`${character.name}'s avatar`}
                            className="w-20 h-20 object-cover mt-2 rounded"
                        />
                    )}
                </li>
            ))}
        </ul>
    );
}
