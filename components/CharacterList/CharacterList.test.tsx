// components/CharacterList/CharacterList.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CharacterList, { Character } from './CharacterList';

// Mock next/navigation router.refresh
const refresh = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ refresh }),
}));

beforeEach(() => {
    (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
    });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
    jest.resetAllMocks();
});

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

    // Safer count-by-names check
    it('renders the same number of names as characters provided', () => {
        render(<CharacterList characters={characters} />);
        const rendered = characters.map((c) => screen.getByText(c.name));
        expect(rendered).toHaveLength(characters.length);
    });

    it('calls DELETE when clicking Delete', async () => {
        render(<CharacterList characters={characters} />);
        fireEvent.click(screen.getByRole('button', { name: /delete hero one/i }));

        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith('/api/characters/1', { method: 'DELETE' })
        );
        expect(refresh).toHaveBeenCalled();
    });
});
