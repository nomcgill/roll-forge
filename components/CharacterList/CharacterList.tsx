// components/CharacterList/CharacterList.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type Character = {
    id: string;
    name: string;
    avatarUrl?: string | null;
};

type Props = {
    characters: Character[];
};

export default function CharacterList({ characters: initial }: Props) {
    const router = useRouter();
    const [characters, setCharacters] = useState<Character[]>(initial);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

        setDeletingId(id);
        const prev = characters;
        setCharacters((list) => list.filter((c) => c.id !== id));

        try {
            const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            // Revalidate server data so /characters stays correct
            router.refresh();
        } catch (err) {
            // Roll back optimistic update
            setCharacters(prev);
            alert('Could not delete character. Please try again.');
        } finally {
            setDeletingId(null);
        }
    }

    if (characters.length === 0) return <p>No characters yet!</p>;

    return (
        <ul className="space-y-2">
            {characters.map((c) => (
                <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                >
                    <div className="flex items-center gap-3">
                        {c.avatarUrl ? (
                            <img
                                src={c.avatarUrl}
                                alt={`${c.name} avatar`}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : null}
                        <span>{c.name}</span>
                    </div>

                    <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                        aria-label={`Delete ${c.name}`}
                    >
                        {deletingId === c.id ? 'Deleting…' : 'Delete'}
                    </button>
                </li>
            ))}
        </ul>
    );
}
// This component displays a list of characters with delete functionality
// It handles optimistic updates and revalidates server data after deletion
// It shows a confirmation dialog before deleting a character
// It uses the Next.js router to refresh the page after deletion
// The component expects an array of characters with id, name, and optional avatarUrl