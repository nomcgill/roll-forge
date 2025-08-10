'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type CharacterFormProps = {
    onSuccess?: () => void;
};

export default function CharacterForm({ onSuccess }: CharacterFormProps) {
    const router = useRouter();
    const [name, setName] = useState<string>('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;

        const trimmedName = name.trim();
        const trimmedAvatar = avatarUrl.trim();
        if (!trimmedName) return; // required by the input too

        setSubmitting(true);
        try {
            const res = await fetch('/api/characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: trimmedName,
                    avatarUrl: trimmedAvatar.length > 0 ? trimmedAvatar : null,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({} as any));
                alert(err?.error ?? 'Error creating character');
                return;
            }

            // success
            alert('Character created!');
            setName('');
            setAvatarUrl('');
            onSuccess?.();

            // Navigate to the list and revalidate
            router.push('/characters');
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Create New Character</h1>

            <input
                className="w-full border p-2 rounded"
                placeholder="Character Name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                aria-label="Character Name"
            />

            <input
                className="w-full border p-2 rounded"
                placeholder="Avatar URL (optional)"
                value={avatarUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAvatarUrl(e.target.value)}
                aria-label="Avatar URL"
            />

            <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                aria-busy={submitting}
            >
                {submitting ? 'Creating…' : 'Create Character'}
            </button>
        </form>
    );
}
