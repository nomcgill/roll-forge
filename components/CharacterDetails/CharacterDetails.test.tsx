import { render, screen } from '@testing-library/react';
import CharacterDetails from './CharacterDetails';

describe('CharacterDetails', () => {
    const baseCharacter = {
        id: '123',
        name: 'Mock Hero',
        avatarUrl: 'https://example.com/avatar.png',
        userId: 'user-1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    it('renders the character name and avatar', () => {
        render(<CharacterDetails character={baseCharacter} />);

        expect(screen.getByText(baseCharacter.name)).toBeInTheDocument();
        expect(
            screen.getByAltText(`${baseCharacter.name}'s avatar`)
        ).toBeInTheDocument();
    });

    it('renders without avatar when avatarUrl is null', () => {
        const characterWithoutAvatar = {
            ...baseCharacter,
            id: '456',
            name: 'No Avatar Hero',
            avatarUrl: null,
        };

        render(<CharacterDetails character={characterWithoutAvatar} />);

        expect(screen.getByText('No Avatar Hero')).toBeInTheDocument();
        expect(
            screen.queryByAltText(`No Avatar Hero's avatar`)
        ).not.toBeInTheDocument();
    });
});
