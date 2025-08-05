'use client'

import { useState, ChangeEvent, FormEvent } from 'react'

type CharacterFormProps = {
    onSuccess?: () => void
}

export default function CharacterForm({ onSuccess }: CharacterFormProps) {
    const [name, setName] = useState<string>('')
    const [avatarUrl, setAvatarUrl] = useState<string>('')

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const res = await fetch('/api/characters', {
            method: 'POST',
            body: JSON.stringify({ name, avatarUrl }),
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (res.ok) {
            alert('Character created!')
            setName('')
            setAvatarUrl('')
            if (onSuccess) onSuccess()
        } else {
            alert('Error creating character')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Create New Character</h1>

            <input
                className="w-full border p-2 rounded"
                placeholder="Character Name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
            />

            <input
                className="w-full border p-2 rounded"
                placeholder="Avatar URL (optional)"
                value={avatarUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAvatarUrl(e.target.value)}
            />

            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                Create Character
            </button>
        </form>
    )
}
