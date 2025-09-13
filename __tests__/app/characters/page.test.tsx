import { render } from "@testing-library/react";

const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    prisma: {
        character: {
            findMany: (...args: unknown[]) => mockFindMany(...args),
        },
    },
}));

const redirect = jest.fn((url: string) => {
    const e: any = new Error("NEXT_REDIRECT");
    e.digest = "NEXT_REDIRECT";
    e.url = url;
    throw e;
});
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
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// (Optional) If CharacterList renders heavy JSX, you can stub it:
jest.mock("@/components/CharacterList", () => ({
    __esModule: true,
    default: ({ characters }: { characters: Array<{ id: string; name: string }> }) => {
        return `LIST:${characters.map((c) => c.id).join(",")}`;
    },
}));

import CharactersPage from "@/app/characters/page";

describe("CharactersPage (list)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows sign-in CTA with callbackUrl for unauthenticated users (no redirect)", async () => {
        // Arrange
        mockGetServerSession.mockResolvedValueOnce(null);

        // Act: server component returns a React node when unauthenticated
        const ui = await CharactersPage();

        // Assert: render the node and verify CTA
        const { getByRole, queryByText } = render(ui as any);

        // Heading sanity check (optional)
        expect(queryByText("Your Characters")).toBeTruthy();

        // CTA link exists and points to signin with callbackUrl=/characters
        const link = getByRole("link", { name: /sign in/i });
        expect(link).toBeTruthy();
        expect(link).toHaveAttribute(
            "href",
            `/api/auth/signin?callbackUrl=${encodeURIComponent("/characters")}`
        );

        // And since we don’t redirect in this branch, ensure redirect() wasn’t called
        expect(redirect).not.toHaveBeenCalled();
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("renders list for authenticated user", async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
        mockFindMany.mockResolvedValueOnce([
            { id: "c1", name: "Aldra", avatarUrl: null },
            { id: "c2", name: "Brix", avatarUrl: null },
        ]);

        const node = await CharactersPage();
        expect(node).toBeTruthy();
        expect(mockFindMany).toHaveBeenCalledWith({
            where: { userId: "user_abc" },
            orderBy: { name: "asc" },
            select: { id: true, name: true, avatarUrl: true },
        });
    });
});
