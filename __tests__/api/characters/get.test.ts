const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { GET } from "@/app/api/characters/GET";

describe("GET /api/characters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("200 with current user's characters", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    const items = [
      { id: "c1", name: "Aldra", avatarUrl: null },
      { id: "c2", name: "Brix", avatarUrl: null },
    ];
    mockFindMany.mockResolvedValueOnce(items);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(items);
  });
});
