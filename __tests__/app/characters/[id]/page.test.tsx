/**
 * @jest-environment jsdom
 */

// Mock next/navigation FIRST (inline to avoid TDZ)
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

// Make headers() return an object where .get() is undefined => base is ""
jest.mock("next/headers", () => ({
    headers: () => ({ get: (_: string) => undefined }),
}));

// next-auth: getServerSession
const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

// Prisma mocks
const mockFindFirst = jest.fn();
const mockActionFindMany = jest.fn();
const mockActionModifierFindMany = jest.fn();

// IMPORTANT: page may call character.findUnique; forward it to mockFindFirst so your existing
// test lines that set mockFindFirst still drive both code paths.
jest.mock("@/lib/prisma", () => ({
    __esModule: true,
    prisma: {
        character: {
            findFirst: (...args: unknown[]) => mockFindFirst(...args),
            findUnique: (...args: unknown[]) => mockFindFirst(...args),
        },
        action: {
            findMany: (...args: unknown[]) => mockActionFindMany(...args),
        },
        actionModifier: {
            findMany: (...args: unknown[]) => mockActionModifierFindMany(...args),
        },
    },
}));

import CharacterPage from "@/app/characters/[id]/page";
import { redirect, notFound } from "next/navigation";

describe("CharacterPage redirect with callbackUrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("redirects unauthenticated users to sign-in with callbackUrl", async () => {
        // Unauthenticated
        mockGetServerSession.mockResolvedValueOnce(null);

        // Page should throw a NEXT_REDIRECT (unauth branch uses redirect())
        await expect(
            CharacterPage({ params: Promise.resolve({ id: "char_123" }) } as any)
        ).rejects.toMatchObject({ digest: "NEXT_REDIRECT" });

        // And it should include the callback back to this character page
        const expected = `/api/auth/signin?callbackUrl=${encodeURIComponent("/characters/char_123")}`;

        expect(redirect).toHaveBeenCalledWith(expected);

        // Otherwise, this also works without changing imports:
        // expect(require("next/navigation").redirect).toHaveBeenCalledWith(expected);

        // No DB lookups should have happened in this branch
        expect(mockFindFirst).not.toHaveBeenCalled();
    });



    it("returns 404 (notFound) when the character is not owned by the user", async () => {
        mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
        mockFindFirst.mockResolvedValueOnce(null); // drives both findFirst/findUnique via forwarding above

        await expect(
            CharacterPage({ params: Promise.resolve({ id: "char_999" }) } as any)
        ).rejects.toMatchObject({ digest: "NEXT_NOT_FOUND" });

        expect(notFound).toHaveBeenCalled();
        expect(redirect).not.toHaveBeenCalled();
    });
});
