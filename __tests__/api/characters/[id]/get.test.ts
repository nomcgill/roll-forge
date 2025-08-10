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
  prisma: { character: { findFirst: jest.fn() } },
}));

jest.mock("next-auth", () => {
  const actual = jest.requireActual("next-auth");
  return { ...actual, getServerSession: jest.fn() };
});

import { GET } from "@/app/api/characters/[id]/GET";

describe("GET /api/characters/[id]", () => {
  it("returns character data when found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "a@b.com" },
    });
    const { prisma } = await import("@/lib/prisma");
    (prisma.character.findFirst as jest.Mock).mockResolvedValue({
      id: "1",
      name: "Hero",
      avatarUrl: null,
    });

    const res = await GET({} as any, { params: { id: "1" } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ id: "1", name: "Hero", avatarUrl: null });
  });

  it("returns 404 when character is not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "a@b.com" },
    });
    const { prisma } = await import("@/lib/prisma");
    (prisma.character.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as any, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });
});
