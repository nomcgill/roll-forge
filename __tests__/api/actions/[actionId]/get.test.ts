const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    action: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
  },
}));

import { GET } from "@/app/api/actions/[actionId]/GET";

describe("GET /api/actions/[actionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 when not found or not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await GET(new Request("http://x"), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(404);
  });

  it("200 with action", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({
      id: "act_ok",
      character: { userId: "me" },
    });
    const res = await GET(new Request("http://x"), {
      params: { actionId: "act_ok" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      action: { id: "act_ok", character: { userId: "me" } },
    });
  });
});
