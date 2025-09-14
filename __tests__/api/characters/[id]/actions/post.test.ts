const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
    action: { create: (...a: unknown[]) => mockCreate(...a) },
  },
}));

import { POST } from "@/app/api/characters/[id]/actions/POST";

function req(body: any) {
  return new Request("http://localhost/api/characters/char_1/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validFactors = {
  conditions: {},
  toHit: { static: 2, signStatic: 1, dice: [] },
  damage: [],
  favorite: false,
};

describe("POST /api/characters/[id]/actions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(req({ name: "Slash", factorsJson: validFactors }), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("404 when character not found/not owned", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "other" });
    const res = await POST(req({ name: "Slash", factorsJson: validFactors }), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(404);
  });

  it("422 on validation error", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "user_abc" });
    // missing toHit/damage structure
    const res = await POST(req({ name: "" }), { params: { id: "char_1" } });
    expect(res.status).toBe(422);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("201 when created", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockFindUnique.mockResolvedValueOnce({ userId: "user_abc" });
    mockCreate.mockResolvedValueOnce({
      id: "act_ok",
      name: "Slash",
      favorite: false,
      factorsJson: validFactors,
    });
    const res = await POST(req({ name: "Slash", factorsJson: validFactors }), {
      params: { id: "char_1" },
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      action: {
        id: "act_ok",
        name: "Slash",
        favorite: false,
        factorsJson: validFactors,
      },
    });
  });
});
