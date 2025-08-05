import { render, screen } from '@testing-library/react';
import CharacterList, { Character } from './CharacterList';

const characters: Character[] = [
    { id: '1', name: 'Hero One', avatarUrl: 'https://img.com/1.png' },
    { id: '2', name: 'Hero Two' },
];

describe('CharacterList', () => {
    it('renders a message when the list is empty', () => {
        render(<CharacterList characters={[]} />);
        expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    });

    it('renders all characters passed in', () => {
        render(<CharacterList characters={characters} />);

        expect(screen.getByText('Hero One')).toBeInTheDocument();
        expect(screen.getByText('Hero Two')).toBeInTheDocument();
        expect(screen.getAllByRole('img')).toHaveLength(1); // Only one has an avatar
    });
});