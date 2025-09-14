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
    actionModifier: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}));

import { PATCH } from "@/app/api/action-modifiers/[modifierId]/PATCH";

function req(body: any) {
  return new Request("http://localhost/api/action-modifiers/mod_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Bless",
  favorite: false,
  factorsJson: {
    eachAttack: true,
    attackImpact: { static: 1, signStatic: 1, dice: [] },
    damage: [],
  },
};

describe("PATCH /api/action-modifiers/[modifierId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PATCH(req(validBody), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(401);
  });

  it("404 not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "other" } });
    const res = await PATCH(req(validBody), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(404);
  });

  it("422 invalid body", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    const res = await PATCH(req({ name: "" }), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 updated", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ character: { userId: "me" } });
    mockUpdate.mockResolvedValueOnce({ id: "mod_1", name: "Bless" });
    const res = await PATCH(req(validBody), {
      params: { modifierId: "mod_1" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      modifier: { id: "mod_1", name: "Bless" },
    });
  });
});
