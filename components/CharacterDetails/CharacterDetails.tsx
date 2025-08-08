'use client'

import { Character } from '@prisma/client'

type Props = {
    character: Character
}

export default function CharacterDetails({ character }: Props) {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">{character.name}</h1>
            {character.avatarUrl && (
                <img src={character.avatarUrl} alt={`${character.name}'s avatar`} className="mt-2 rounded" />
            )}
        </div>
    )
}