/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock RotatingDie so this suite doesn't load Three.js
jest.mock('@/components/RotatingDie', () => () => <div data-testid="mock-rotating-die" />);

// Mock next/navigation pieces we use in the page
const replaceMock = jest.fn();
let searchParamsGetImpl: (k: string) => string | null = () => null;

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: replaceMock }),
    useSearchParams: () => ({ get: (k: string) => searchParamsGetImpl(k) }),
}));

// Mock next-auth for status + signIn
const signInMock = jest.fn();
let statusValue: 'authenticated' | 'unauthenticated' = 'unauthenticated';

jest.mock('next-auth/react', () => ({
    signIn: (...args: any[]) => signInMock(...args),
    useSession: () => ({ status: statusValue }),
}));

// Import after mocks
import HomePage from '@/app/page';

afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    // reset defaults
    statusValue = 'unauthenticated';
    searchParamsGetImpl = () => null;
});

describe('HomePage (sign-in hub)', () => {
    it('shows Google & Facebook buttons when unauthenticated', () => {
        render(<HomePage />);
        // These labels match the buttons rendered on the homepage
        expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
        expect(screen.getByText(/Continue with Facebook/i)).toBeInTheDocument();
        // background anim placeholder present
        expect(screen.getByTestId('mock-rotating-die')).toBeInTheDocument();
    });

    it('clicking Google uses callbackUrl from query when present', () => {
        searchParamsGetImpl = (k) => (k === 'callbackUrl' ? '/characters/123' : null);
        render(<HomePage />);
        fireEvent.click(screen.getByText(/Continue with Google/i));
        expect(signInMock).toHaveBeenCalledWith('google', { callbackUrl: '/characters/123' });
    });

    it('clicking Facebook falls back to /characters when callbackUrl is missing', () => {
        render(<HomePage />);
        fireEvent.click(screen.getByText(/Continue with Facebook/i));
        expect(signInMock).toHaveBeenCalledWith('facebook', { callbackUrl: '/characters' });
    });

    it('redirects immediately when authenticated and renders nothing', () => {
        statusValue = 'authenticated';
        const { container } = render(<HomePage />);
        expect(replaceMock).toHaveBeenCalledWith('/characters');
        expect(container.firstChild).toBeNull(); // page returns null in this state
    });
});
