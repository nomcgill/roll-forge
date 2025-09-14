const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => mockGetServerSession(...a),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    actionModifier: { create: (...a: unknown[]) => mockCreate(...a) },
  },
}));

import { POST } from "@/app/api/characters/[id]/action-modifiers/POST";

function req(body: any) {
  return new Request(
    "http://localhost/api/characters/char_1/action-modifiers",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const valid = {
  name: "Rage",
  favorite: false,
  factorsJson: {
    eachAttack: true,
    attackImpact: {
      static: 0,
      signStatic: 1,
      dice: [{ count: 1, size: 20, signDice: 1 }],
    },
    damage: [],
  },
};

describe("POST /api/characters/[id]/action-modifiers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(req(valid), { params: { id: "char_1" } });
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("404 when not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "other" });
    const res = await POST(req(valid), { params: { id: "char_1" } });
    expect(res.status).toBe(404);
  });

  it("422 on validation fail", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "me" });
    const res = await POST(req({ name: "" }), { params: { id: "char_1" } });
    expect(res.status).toBe(422);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("201 when created", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "me" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "me" });
    mockCreate.mockResolvedValueOnce({ id: "mod_ok", name: "Rage" });
    const res = await POST(req(valid), { params: { id: "char_1" } });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      modifier: { id: "mod_ok", name: "Rage" },
    });
  });
});
