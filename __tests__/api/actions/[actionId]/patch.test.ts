const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    action: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

import { PATCH } from "@/app/api/actions/[actionId]/PATCH";

function req(body: any) {
  return new Request("http://localhost/api/actions/act_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Renamed",
  favorite: true,
  factorsJson: {
    conditions: {},
    toHit: { static: 1, signStatic: 1, dice: [] },
    damage: [],
  },
};

describe("PATCH /api/actions/[actionId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PATCH(req(validBody), { params: { actionId: "act_1" } });
    expect(res.status).toBe(401);
  });

  it("404 not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await PATCH(req(validBody), { params: { actionId: "act_1" } });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    const res = await PATCH(req({ name: "" }), {
      params: { actionId: "act_1" },
    });
    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 updated", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    mockUpdate.mockResolvedValueOnce({ id: "act_1", name: "Renamed" });
    const res = await PATCH(req(validBody), { params: { actionId: "act_1" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      action: { id: "act_1", name: "Renamed" },
    });
  });
});
