/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/characters/[id]/DELETE";
import { getServerSession } from "next-auth";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("DELETE /api/characters/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
  });

  it("deletes character and returns 204", async () => {
    (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "abc123",
      name: "To Delete",
      avatarUrl: null,
      userId: "user-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });
    (prisma.character.delete as jest.Mock).mockResolvedValueOnce({});

    const req = {} as NextRequest;
    const res = await DELETE(req, { params: { id: "abc123" } });

    expect(res.status).toBe(204);
  });

  it("returns 500 on error", async () => {
    (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "abc123",
      name: "To Delete",
      avatarUrl: null,
      userId: "user-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });
    (prisma.character.delete as jest.Mock).mockRejectedValueOnce(
      new Error("DB error")
    );

    const req = {} as NextRequest;
    const res = await DELETE(req, { params: { id: "abc123" } });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ error: "Internal Server Error" });
  });
});
