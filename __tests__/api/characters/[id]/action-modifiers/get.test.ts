const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    actionModifier: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}));

import { GET } from "@/app/api/characters/[id]/action-modifiers/GET";

describe("GET /api/characters/[id]/action-modifiers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 when not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "other" });
    const res = await GET(new Request("http://x"), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(404);
  });

  it("200 with modifiers list", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "me" });
    mockFindMany.mockResolvedValueOnce([{ id: "mod_1" }]);
    const res = await GET(new Request("http://x"), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ modifiers: [{ id: "mod_1" }] });
  });
});
