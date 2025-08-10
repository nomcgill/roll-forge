const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

// Prisma named export
const mockFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    prisma: {
        character: {
            findFirst: (...args: unknown[]) => mockFindFirst(...args),
        },
    },
}));

// Make headers() return an object where .get() is undefined => base is ""
jest.mock("next/headers", () => ({
    headers: () => ({ get: (_: string) => undefined }),
}));

// next/navigation throws for redirect/notFound in tests
const redirect = jest.fn((url: string) => {
    const e: any = new Error("NEXT_REDIRECT");
    e.digest = "NEXT_REDIRECT";
    e.url = url;
    throw e;
});
const notFound = jest.fn(() => {
    const e: any = new Error("NEXT_NOT_FOUND");
    e.digest = "NEXT_NOT_FOUND";
    throw e;
});

jest.mock("next/navigation", () => ({
    redirect,
    notFound,
}));

import CharacterPage from "@/app/characters/[id]/page";

describe("CharacterPage redirect with callbackUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("redirects unauthenticated users to sign-in with callbackUrl", async () => {
        mockGetServerSession.mockResolvedValueOnce(null);

        await expect(
            CharacterPage({ params: Promise.resolve({ id: "char_123" }) })
        ).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

        // callbackUrl should be the original page (relative here because headers mocked)
        const expected = `/api/auth/signin?callbackUrl=${encodeURIComponent(
            "/characters/char_123"
        )}`;
        expect(redirect).toHaveBeenCalledWith(expected);
        expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("returns 404 (notFound) when the character is not owned by the user", async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
        mockFindFirst.mockResolvedValueOnce(null);

        await expect(
            CharacterPage({ params: Promise.resolve({ id: "char_999" }) })
        ).rejects.toMatchObject({ digest: "NEXT_NOT_FOUND" });

        expect(notFound).toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
    });
});
