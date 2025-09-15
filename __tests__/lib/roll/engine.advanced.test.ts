/**
 * @jest-environment node
 */

import { executeActionGroup } from "@/lib/roll/engine";
import {
  makePrefs,
  makeSimpleAction,
  oneNormalTally,
  rngFromSequence,
} from "@/__tests__/fixtures";
import type { ModifierRecord } from "@/components/roll/types";

describe("roll engine: advanced golden cases", () => {
  test("ignores adv/disadv tallies when advRules is false", () => {
    const action = makeSimpleAction("a1", "Test Swing", {
      toHitStatic: 3,
      damageDieSize: 6,
      damageType: "Slashing",
    });

    const prefs = makePrefs({ advRules: false });

    // Only adv/disadv tallies provided; should be ignored.
    const tallies = { [action.id]: { normal: 0, adv: 1, disadv: 1 } } as const;

    const group = executeActionGroup({
      actions: [action],
      modifiers: [],
      preferences: prefs,
      selection: {
        actionTallies: tallies as any,
        perActionModifierIds: [],
        perTurnModifierIds: [],
      },
      rng: rngFromSequence([0.5, 0.5]),
    });

    expect(group.rows).toHaveLength(0);
    expect(group.totals.grand).toBe(0);
    expect(group.totals.byType.length).toBe(0);
  });

  test("crit threshold override prevents doubling when set above 20", () => {
    const action = makeSimpleAction("a1", "Longsword", {
      toHitStatic: 5,
      damageDieSize: 8,
      damageType: "Slashing",
    });

    // 21 is unattainable on a d20 → no crit even on a natural 20.
    const prefs = makePrefs({ critThreshold: 21 });

    // First → d20 (would be 20); second → d8 (0.25 → 3 on d8).
    const rng = rngFromSequence([0.999, 0.25]);

    const group = executeActionGroup({
      actions: [action],
      modifiers: [],
      preferences: prefs,
      selection: {
        actionTallies: oneNormalTally(action.id),
        perActionModifierIds: [],
        perTurnModifierIds: [],
      },
      rng,
    });

    expect(group.rows).toHaveLength(1);
    const row: any = group.rows[0];
    expect(row.crit).toBe(false);
    expect(row.damage).toHaveLength(1);
    expect(row.damage[0].typeLabel).toBe("Slashing");
    expect(row.damage[0].amount).toBe(3); // not doubled
  });

  test("per-action modifier adds attackImpact to to-hit and damage null type inherits the action's damage type", () => {
    const action = makeSimpleAction("a1", "Shortsword", {
      toHitStatic: 0,
      damageDieSize: 6,
      damageType: "Slashing",
    });

    const perActionMod: ModifierRecord = {
      id: "m1",
      characterId: "char-1",
      name: "Precision + Chip",
      favorite: false,
      factorsJson: {
        eachAttack: true,
        attackImpact: { static: 2, signStatic: 1, dice: [] },
        damage: [
          // null inherits first action damage type ("Slashing")
          { type: null, static: 1, signStatic: 1, dice: [] },
        ],
      },
    } as any;

    const prefs = makePrefs();
    const rng = rngFromSequence([0.2, 0.2]); // non-crit d20, then 1d6

    const group = executeActionGroup({
      actions: [action],
      modifiers: [perActionMod],
      preferences: prefs,
      selection: {
        actionTallies: oneNormalTally(action.id),
        perActionModifierIds: [perActionMod.id],
        perTurnModifierIds: [],
      },
      rng,
    });

    expect(group.rows).toHaveLength(1);
    const row: any = group.rows[0];

    // Combined static bonus from modifier visible in success detail
    expect(String(row.successDetail)).toMatch(/\(\+2\)/);

    // Modifier's chip shows up as "Slashing" via inheritance
    const dmg = row.damage.find((d: any) => d.typeLabel === "Slashing");
    expect(dmg).toBeTruthy();
    if (dmg) {
      expect(dmg.amount).toBeGreaterThanOrEqual(1);
    }
  });
});
