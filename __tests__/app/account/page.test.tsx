/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

// next/navigation (inline mocks to avoid TDZ)
jest.mock("next/navigation", () => ({
    __esModule: true,
    redirect: jest.fn((url?: string) => {
        const e: any = new Error("NEXT_REDIRECT");
        e.digest = "NEXT_REDIRECT";
        e.url = url;
        throw e;
    }),
    notFound: jest.fn(() => {
        const e: any = new Error("NEXT_NOT_FOUND");
        e.digest = "NEXT_NOT_FOUND";
        throw e;
    }),
}));

// next-auth
const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

// headers() safe default
jest.mock("next/headers", () => ({
    headers: () => ({ get: (_: string) => undefined }),
}));

// Import after mocks
import AccountPage from "@/app/account/page";
import { redirect, notFound } from "next/navigation";

describe("Account page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("redirects unauthenticated users to sign-in with callback to /account", async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        await expect(AccountPage()).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
        expect(redirect).toHaveBeenCalledWith(
            `/api/auth/signin?callbackUrl=${encodeURIComponent("/account")}`
        );
    });

    it("renders 'Back to Characters' link and sign-out button for authenticated users", async () => {
        mockGetServerSession.mockResolvedValueOnce({
            user: { id: "user_abc", name: "Nolan", email: "nolan@example.com" },
            expires: "2999-01-01T00:00:00.000Z",
        });

        const ui = await AccountPage();
        render(ui as any);

        const backLink = screen.getByRole("link", {
            name: /back to your character list/i,
        });
        expect(backLink).toBeTruthy();
        expect(backLink).toHaveAttribute("href", "/characters");

        expect(screen.queryByText(/sign out/i)).toBeTruthy();

        expect(redirect).not.toHaveBeenCalled();
        expect(notFound).not.toHaveBeenCalled();
    });
});
