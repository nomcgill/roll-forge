const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    actionModifier: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
  },
}));

import { GET } from "@/app/api/action-modifiers/[modifierId]/GET";

describe("GET /api/action-modifiers/[modifierId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await GET(new Request("http://x"), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(404);
  });

  it("200 with modifier", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({
      id: "mod_ok",
      character: { userId: "me" },
    });
    const res = await GET(new Request("http://x"), {
      params: { modifierId: "mod_ok" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      modifier: { id: "mod_ok", character: { userId: "me" } },
    });
  });
});
