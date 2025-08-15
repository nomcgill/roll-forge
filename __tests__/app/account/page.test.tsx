const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

// Mock redirect behavior like your other page tests
const redirect = jest.fn((url: string) => {
    const e: any = new Error("NEXT_REDIRECT");
    e.digest = "NEXT_REDIRECT";
    e.url = url;
    throw e;
});
jest.mock("next/navigation", () => ({ redirect }));

// Stub the client-only SignOutButton so server-render test stays simple
jest.mock("@/components/Account/SignOutButton", () => ({
    __esModule: true,
    default: () => <button aria-label="Sign out">Sign Out</button>,
}));

import AccountPage from "@/app/account/page";

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
        mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });

        const ui = await AccountPage();
        // Render the returned JSX to assert content
        // (Using Testing Library render here would require jsdom; this inline
        // check is sufficient because we mocked SignOutButton.)
        expect(ui).toBeTruthy();

        // To assert content, mount with RTL:
        // (If your page tests already use RTL for SSR pages, do that instead.)
        // For clarity and consistency with your other page tests, here is the RTL approach:

        const { render, screen } = await import("@testing-library/react");
        render(ui as any);

        const backLink = screen.getByRole("link", { name: /back to your character list/i });
        expect(backLink).toHaveAttribute("href", "/characters");

        expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
});
