/** @jest-environment node */
import { GET } from "@/app/api/characters/[id]/GET";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

// Minimal mocks to avoid Next's request-scope `headers()` call inside getServerSession
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
// Your route imports `authOptions` from here; we just need a stubbed value.
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findUnique: jest.fn(),
    },
  },
}));

describe("GET /api/characters/[id]", () => {
  it("returns character data when found", async () => {
    // Pretend we're authenticated
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { email: "test@example.com" },
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "123",
      name: "Test Hero",
      avatarUrl: "https://example.com/avatar.png",
    });

    const request = new NextRequest("http://localhost:3000/api/characters/123");
    const response = await GET(request, { params: { id: "123" } });

    const json = await response.json();
    expect(json).toEqual({
      id: "123",
      name: "Test Hero",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns 404 when character is not found", async () => {
    // Still authenticated
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { email: "test@example.com" },
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/characters/does-not-exist"
    );
    const response = await GET(request, { params: { id: "does-not-exist" } });

    expect(response.status).toBe(404);
  });
});
