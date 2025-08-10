import { getServerSession } from "next-auth";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { character: { findMany: jest.fn() } },
}));

// Keep real next-auth default export, only stub getServerSession
jest.mock("next-auth", () => {
  const actual = jest.requireActual("next-auth");
  return { ...actual, getServerSession: jest.fn() };
});

// import { GET } from "@/app/api/characters/GET";
import { GET } from "@/app/api/characters/route";

describe("GET /api/characters", () => {
  it("returns 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns characters for authenticated user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });

    const { prisma } = await import("@/lib/prisma");
    (prisma.character.findMany as jest.Mock).mockResolvedValue([
      { id: "1", name: "Hero", avatarUrl: null },
    ]);

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual([{ id: "1", name: "Hero", avatarUrl: null }]);
  });
});
