import {
  actionCreateSchema,
  actionModifierCreateSchema,
} from "@/lib/validation/actionSchemas";

describe("actionCreateSchema", () => {
  it("accepts a minimal valid Action", () => {
    const data = {
      name: "Shortsword",
      rollDetails: {
        toHit: {
          static: 0,
          signStatic: 1,
          dice: [{ count: 1, size: 20, signDice: 1, canCrit: true }],
        },
        damage: [],
      },
    };
    const parsed = actionCreateSchema.parse(data);
    expect(parsed.name).toBe("Shortsword");
  });

  it("rejects long names (>25)", () => {
    const bad = {
      name: "X".repeat(26),
      rollDetails: { damage: [] },
    };
    expect(() => actionCreateSchema.parse(bad)).toThrow();
  });
});

describe("actionModifierCreateSchema", () => {
  it("accepts per-action modifier with type:null (None base)", () => {
    const data = {
      name: "Rage",
      rollDetails: {
        eachAttack: true,
        damage: [{ type: null, source: "rage", static: 2, signStatic: 1 }],
      },
    };
    expect(() => actionModifierCreateSchema.parse(data)).not.toThrow();
  });

  it("rejects type:null when eachAttack=false (per-turn)", () => {
    const data = {
      name: "Bad",
      rollDetails: {
        eachAttack: false,
        damage: [{ type: null, source: "oops", static: 2, signStatic: 1 }],
      },
    };
    expect(() => actionModifierCreateSchema.parse(data)).toThrow();
  });

  it("rejects long names (>25)", () => {
    const bad = {
      name: "Y".repeat(26),
      rollDetails: { eachAttack: true, damage: [] },
    };
    expect(() => actionModifierCreateSchema.parse(bad)).toThrow();
  });
});
