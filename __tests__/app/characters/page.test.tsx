// __tests__/app/characters/page.test.tsx

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
jest.mock("next/navigation", () => ({ redirect }));

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

    it("redirects unauthenticated users to sign-in with callbackUrl", async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        await expect(CharactersPage()).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });
        const expected = `/api/auth/signin?callbackUrl=${encodeURIComponent("/characters")}`;
        expect(redirect).toHaveBeenCalledWith(expected);
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
