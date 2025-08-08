import { render, screen, waitFor } from '@testing-library/react';
import CharacterPage from '@/app/characters/[id]/page';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

jest.mock('@/lib/prisma', () => ({
    prisma: {
        character: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('next/navigation', () => ({
    ...jest.requireActual('next/navigation'),
    notFound: jest.fn(),
}));

describe('CharacterPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the character when found', async () => {
        (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce({
            id: '123',
            name: 'Test Hero',
            avatarUrl: 'https://example.com/avatar.png',
        });

        // params is now a Promise
        const params = Promise.resolve({ id: '123' });

        render(await CharacterPage({ params }));

        await waitFor(() => {
            expect(screen.getByText('Test Hero')).toBeInTheDocument();
        });
    });

    it('calls notFound when character does not exist', async () => {
        (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce(null);

        const params = Promise.resolve({ id: 'does-not-exist' });

        await CharacterPage({ params });

        expect(notFound).toHaveBeenCalled();
    });
});
