/**
 * @jest-environment node
 */

import {
  actionCreateSchema,
  actionModifierCreateSchema,
} from "@/lib/validation/actionSchemas";

describe("actionCreateSchema", () => {
  it("accepts a minimal valid Action", () => {
    const data = {
      name: "Shortsword",
      characterId: "char-1",
      factorsJson: {
        toHit: {
          static: 0,
          signStatic: 1,
          dice: [{ count: 1, size: 20, signDice: 1, canCrit: true }],
        },
        damage: [
          {
            type: "Slashing",
            static: 0,
            signStatic: 1,
            dice: [{ count: 1, size: 6, signDice: 1 }],
          },
        ],
      },
    };

    const parsed = actionCreateSchema.parse(data);
    expect(parsed.name).toBe("Shortsword");
    expect(parsed.factorsJson.damage[0].dice[0].size).toBe(6);
  });
});

describe("actionModifierCreateSchema", () => {
  it("accepts per-action modifier with type:null (None base)", () => {
    const data = {
      name: "Sneak Attack (per action)",
      characterId: "char-1",
      eachAttack: true,
      factorsJson: {
        attackImpact: {}, // required object by schema (minimal)
        damage: [
          {
            type: null, // allowed for per-action
            static: 1,
            signStatic: 1,
            dice: [],
          },
        ],
      },
    };

    expect(() => actionModifierCreateSchema.parse(data)).not.toThrow();
  });

  it("rejects type:null when eachAttack=false (per-turn)", () => {
    const invalid = {
      name: "Divine Favor (per turn)",
      characterId: "char-1",
      eachAttack: false,
      factorsJson: {
        attackImpact: {}, // required object by schema (minimal)
        damage: [
          {
            type: null, // not allowed for per-turn
            static: 2,
            signStatic: 1,
            dice: [],
          },
        ],
      },
    };

    expect(() => actionModifierCreateSchema.parse(invalid)).toThrow();
  });
});
