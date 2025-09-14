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
    action: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
}));

import { DELETE } from "@/app/api/actions/[actionId]/DELETE";

describe("DELETE /api/actions/[actionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await DELETE(new Request("http://x"), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await DELETE(new Request("http://x"), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("200 ok on delete", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    const res = await DELETE(new Request("http://x"), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
