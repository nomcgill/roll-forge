const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} as unknown }));

const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  prisma: {
    character: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { POST } from "@/app/api/characters/POST";

function makeReq(body: any) {
  return new Request("http://localhost/api/characters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/characters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ name: "A" }));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("422 when validation fails", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    const res = await POST(makeReq({ name: "" }));
    expect(res.status).toBe(422);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("201 with Location when created", async () => {
    mockGetServerSession.mockResolvedValueOnce({ user: { id: "user_abc" } });
    mockCreate.mockResolvedValueOnce({
      id: "char_ok",
      name: "Okie",
      avatarUrl: null,
      userId: "user_abc",
    });

    const res = await POST(makeReq({ name: "Okie", avatarUrl: "" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("Location")).toBe("/characters/char_ok");
    expect(await res.json()).toEqual({
      id: "char_ok",
      name: "Okie",
      avatarUrl: null,
      userId: "user_abc",
    });
  });
});
