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
  prisma: { character: { findFirst: jest.fn(), delete: jest.fn() } },
}));

jest.mock("next-auth", () => {
  const actual = jest.requireActual("next-auth");
  return { ...actual, getServerSession: jest.fn() };
});

import { DELETE } from "@/app/api/characters/[id]/DELETE";

describe("DELETE /api/characters/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await DELETE({} as any, { params: { id: "1" } });
    expect(res.status).toBe(401);
  });

  it("deletes when owned by user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "a@b.com" },
    });
    const { prisma } = await import("@/lib/prisma");
    (prisma.character.findFirst as jest.Mock).mockResolvedValue({ id: "1" });
    (prisma.character.delete as jest.Mock).mockResolvedValue({});

    const res = await DELETE({} as any, { params: { id: "1" } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: "1" });
  });

  it("returns 404 when not owned/not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "a@b.com" },
    });
    const { prisma } = await import("@/lib/prisma");
    (prisma.character.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await DELETE({} as any, { params: { id: "nope" } });
    expect(res.status).toBe(404);
  });
});
