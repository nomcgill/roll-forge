const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { PATCH } from "@/app/api/characters/[id]/PATCH";

function makeReq(body: any) {
  return new Request("http://localhost/api/characters/char_123", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/characters/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await PATCH(makeReq({ name: "New" }), {
      params: { id: "char_123" },
    });
    expect(res.status).toBe(401);
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 when character not owned or missing", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(makeReq({ name: "New" }), {
      params: { id: "char_404" },
    });
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("422 when validation fails (empty name)", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindFirst.mockResolvedValueOnce({ id: "char_123" });

    const res = await PATCH(makeReq({ name: "" }), {
      params: { id: "char_123" },
    });
    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("422 when no fields provided", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindFirst.mockResolvedValueOnce({ id: "char_123" });

    const res = await PATCH(makeReq({}), { params: { id: "char_123" } });
    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 with updated record (coerces avatarUrl '' -> null; accepts preferences JSON)", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindFirst.mockResolvedValueOnce({ id: "char_123" });

    const updated = {
      id: "char_123",
      name: "Aria",
      avatarUrl: null,
      preferences: { theme: "dark", dice: { advantage: true } },
      userId: "user_abc",
    };
    mockUpdate.mockResolvedValueOnce(updated);

    const res = await PATCH(
      makeReq({
        name: "Aria",
        avatarUrl: "",
        preferences: { theme: "dark", dice: { advantage: true } },
      }),
      { params: { id: "char_123" } }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(updated);

    // Expect the prisma.update call to include our typed `select`
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "char_123" },
      data: {
        name: "Aria",
        avatarUrl: null,
        preferences: { theme: "dark", dice: { advantage: true } },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        preferences: true,
        userId: true,
      },
    });
  });
});
