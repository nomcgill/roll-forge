/**
 * @jest-environment node
 */

import { executeActionGroup, recomputeTotals } from "@/lib/roll/engine";
import {
  makePrefs,
  makeSimpleAction,
  makePerTurnModifier,
  oneNormalTally,
  rngFromSequence,
} from "@/__tests__/fixtures";

describe("roll engine: executeActionGroup", () => {
  test("crits double damage dice (5e), success detail shows base bonus", () => {
    // Arrange
    const action = makeSimpleAction("a1", "Longsword", {
      toHitStatic: 5,
      damageDieSize: 8,
      damageType: "Slashing",
    });

    const prefs = makePrefs({
      critRules: "5e-double",
      critThreshold: 20,
    });

    // rng sequence:
    // - First call rolls the d20. 0.999 → 1 + floor(19.98) = 20 (crit).
    // - Next two calls roll the d8 twice (crit: dice doubled). 0.25 → 3, 0.25 → 3.
    const rng = rngFromSequence([0.999, 0.25, 0.25]);

    // Act
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

    // Assert
    expect(group.rows).toHaveLength(1);
    const row = group.rows[0];

    // Should be a crit
    expect(row.crit).toBe(true);

    // Success detail uses natural + signed static bonus form (no adv/disadv pairing here)
    expect(row.successDetail).toContain("(+5)");

    // Damage was 1d8, doubled on crit: 3 + 3 = 6
    expect(row.damage).toHaveLength(1);
    expect(row.damage[0].typeLabel).toBe("Slashing");
    expect(row.damage[0].amount).toBe(6);

    // Totals reflect the damage
    expect(group.totals.grand).toBe(6);
    expect(group.totals.byType.find((t) => t.label === "Slashing")?.total).toBe(
      6
    );
  });

  test("per-turn modifier damage is included once per group", () => {
    // Arrange: 1 normal swing, plus a per-turn flat +2 radiant
    const action = makeSimpleAction("a1", "Mace", {
      toHitStatic: 0,
      damageDieSize: 6,
      damageType: "Bludgeoning",
    });
    const mod = makePerTurnModifier("m1", "Divine Favor", {
      flatDamage: 2,
      type: "Radiant",
    });
    const prefs = makePrefs();

    // rng yields low values; exact dice result is not important here.
    const rng = rngFromSequence([0.1, 0.1]);

    // Act
    const group = executeActionGroup({
      actions: [action],
      modifiers: [mod],
      preferences: prefs,
      selection: {
        actionTallies: oneNormalTally(action.id),
        perActionModifierIds: [],
        perTurnModifierIds: [mod.id],
      },
      rng,
    });

    // Assert: Expect one action row and one per-turn modifier row
    expect(group.rows.length).toBeGreaterThanOrEqual(1);
    const hasPerTurnRow = group.rows.some((r) => r.kind === "perTurnModifier");
    expect(hasPerTurnRow).toBe(true);

    // Totals include the radiant +2 exactly once in the grand total
    const radiantTotal =
      group.totals.byType.find((t) => t.label === "Radiant")?.total ?? 0;
    expect(radiantTotal).toBe(2);
    expect(group.totals.grand).toBeGreaterThanOrEqual(2);
  });
});

describe("roll engine: recomputeTotals", () => {
  test("sums grand total and by-type for selected rows only", () => {
    // Minimal synthetic rows; using the same shape returned by executeActionGroup.
    const rows = [
      {
        id: "r1",
        kind: "action" as const,
        name: "Row 1",
        mode: "normal" as const,
        successTotal: 10,
        successDetail: "10 (+0)",
        crit: false,
        labels: [],
        selected: true,
        damage: [
          { amount: 4, type: "Slashing", typeLabel: "Slashing", parts: ["—"] },
          { amount: 1, type: null, typeLabel: "Undefined", parts: ["—"] },
        ],
      },
      {
        id: "r2",
        kind: "perTurnModifier" as const,
        name: "Radiant Smite",
        labels: [],
        selected: false, // deselected rows should not count
        damage: [
          { amount: 2, type: "Radiant", typeLabel: "Radiant", parts: ["—"] },
        ],
      },
    ];

    const totals = recomputeTotals(rows as any);
    expect(totals.grand).toBe(5);
    const slashing =
      totals.byType.find((t) => t.label === "Slashing")?.total ?? 0;
    const undef =
      totals.byType.find((t) => t.label === "Undefined")?.total ?? 0;
    expect(slashing).toBe(4);
    expect(undef).toBe(1);
  });
});
