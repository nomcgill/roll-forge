import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CharacterForm from '@/components/CharacterForm'

describe('CharacterForm', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            })
        ) as jest.Mock
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('renders name and avatar input fields and submit button', () => {
        render(<CharacterForm />)

        expect(screen.getByPlaceholderText('Character Name')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Avatar URL (optional)')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument()
    })

    it('submits character data and calls fetch with correct payload', async () => {
        render(<CharacterForm />)

        fireEvent.change(screen.getByPlaceholderText('Character Name'), {
            target: { value: 'Test Hero' },
        })

        fireEvent.change(screen.getByPlaceholderText('Avatar URL (optional)'), {
            target: { value: 'https://avatar.url/image.png' },
        })

        fireEvent.click(screen.getByRole('button', { name: /create character/i }))

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/characters',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test Hero',
                        avatarUrl: 'https://avatar.url/image.png',
                    }),
                })
            )
        )
    })
})
