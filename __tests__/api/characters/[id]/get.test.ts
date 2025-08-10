// __tests__/api/characters/[id]/get.test.ts

const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { GET } from "@/app/api/characters/[id]/GET";

function makeReq(url = "http://localhost/api/characters/char_123") {
  return new Request(url, { method: "GET" });
}

describe("GET /api/characters/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await GET(makeReq(), { params: { id: "char_123" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("404 when character not owned or missing", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await GET(makeReq(), { params: { id: "char_404" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("200 with character when owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    const character = { id: "char_ok", name: "Okie", userId: "user_abc" };
    mockFindFirst.mockResolvedValueOnce(character);

    const res = await GET(makeReq(), { params: { id: "char_ok" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(character);
  });
});
