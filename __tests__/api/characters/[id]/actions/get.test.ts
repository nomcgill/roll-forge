const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    action: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}));

import { GET } from "@/app/api/characters/[id]/actions/GET";

describe("GET /api/characters/[id]/actions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://x"), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("404 when character not found or not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "someone_else" });
    const res = await GET(new Request("http://x"), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(404);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("200 with actions list", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "user_abc" });
    mockFindMany.mockResolvedValueOnce([{ id: "act_1" }, { id: "act_2" }]);
    const res = await GET(new Request("http://x"), {
      params: { id: "char_ok" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      actions: [{ id: "act_1" }, { id: "act_2" }],
    });
  });
});
