// __tests__/api/characters/post.test.ts
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
  prisma: {
    user: { findUnique: jest.fn() },
    character: { create: jest.fn() },
  },
}));

jest.mock("next-auth", () => {
  const actual = jest.requireActual("next-auth");
  return { ...actual, getServerSession: jest.fn() };
});

import { POST } from "@/app/api/characters/POST";

describe("POST /api/characters", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = { json: async () => ({ name: "Hero" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });

    const req = { json: async () => ({}) } as any; // no name
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates character when valid", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });

    const { prisma } = await import("@/lib/prisma");
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user123" });
    (prisma.character.create as jest.Mock).mockResolvedValue({
      id: "char123",
      name: "Hero",
      avatarUrl: null,
    });

    const req = {
      json: async () => ({ name: "Hero", avatarUrl: null }),
    } as any;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ id: "char123", name: "Hero", avatarUrl: null });
  });
});
