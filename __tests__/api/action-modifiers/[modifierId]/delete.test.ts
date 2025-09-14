const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    actionModifier: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

import { DELETE } from "@/app/api/action-modifiers/[modifierId]/DELETE";

describe("DELETE /api/action-modifiers/[modifierId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await DELETE(new Request("http://x"), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await DELETE(new Request("http://x"), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("200 ok on delete", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    const res = await DELETE(new Request("http://x"), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
