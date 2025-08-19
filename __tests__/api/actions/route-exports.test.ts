// Just smoke-check that routes export handlers; deeper tests later when wired end-to-end.
describe("Actions & Modifiers route exports", () => {
  it("characters/[id]/actions has GET & POST", async () => {
    const get = await import("@/app/api/characters/[id]/actions/GET");
    const post = await import("@/app/api/characters/[id]/actions/POST");
    expect(typeof get.GET).toBe("function");
    expect(typeof post.POST).toBe("function");
  });

  it("actions/[actionId] has GET, PATCH, DELETE", async () => {
    const g = await import("@/app/api/actions/[actionId]/GET");
    const p = await import("@/app/api/actions/[actionId]/PATCH");
    const d = await import("@/app/api/actions/[actionId]/DELETE");
    expect(typeof g.GET).toBe("function");
    expect(typeof p.PATCH).toBe("function");
    expect(typeof d.DELETE).toBe("function");
  });

  it("characters/[id]/action-modifiers has GET & POST", async () => {
    const get = await import("@/app/api/characters/[id]/action-modifiers/GET");
    const post = await import(
      "@/app/api/characters/[id]/action-modifiers/POST"
    );
    expect(typeof get.GET).toBe("function");
    expect(typeof post.POST).toBe("function");
  });

  it("action-modifiers/[modifierId] has GET, PATCH, DELETE", async () => {
    const g = await import("@/app/api/action-modifiers/[modifierId]/GET");
    const p = await import("@/app/api/action-modifiers/[modifierId]/PATCH");
    const d = await import("@/app/api/action-modifiers/[modifierId]/DELETE");
    expect(typeof g.GET).toBe("function");
    expect(typeof p.PATCH).toBe("function");
    expect(typeof d.DELETE).toBe("function");
  });
});
