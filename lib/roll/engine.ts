// lib/roll/engine.ts
import type {
  ActionRecord,
  ModifierRecord,
  CharacterPreferences,
  DiceEntry,
  DiceEntryToHit,
  RowDamagePiece,
  ActionRow,
  PerTurnRow,
  HistoryGroup,
  DieSize,
  Signed,
  RollMode,
  ActionDamageLine,
  ModifierDamageLine,
  CritRules,
  Tally,
} from "@/components/roll/types";

type Rng = () => number;

export function executeActionGroup(args: {
  actions: ActionRecord[];
  modifiers: ModifierRecord[];
  selection: {
    actionTallies: Record<string, Tally>;
    perActionModifierIds: string[];
    perTurnModifierIds: string[];
  };
  preferences: CharacterPreferences;
  rng?: Rng;
}): HistoryGroup {
  const { actions, modifiers, selection, preferences } = args;
  const rng: Rng = args.rng ?? Math.random;

  const now = Date.now();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const actById = new Map(actions.map((a) => [a.id, a]));
  const modById = new Map(modifiers.map((m) => [m.id, m]));

  const perActionMods = selection.perActionModifierIds
    .map((id) => modById.get(id))
    .filter(Boolean) as ModifierRecord[];
  const perTurnMods = selection.perTurnModifierIds
    .map((id) => modById.get(id))
    .filter(Boolean) as ModifierRecord[];

  const rows: (ActionRow | PerTurnRow)[] = [];

  // build action rows
  Object.entries(selection.actionTallies).forEach(([actionId, tally]) => {
    const act = actById.get(actionId);
    if (!act) return;

    const firstActionType = act.factorsJson.damage?.[0]?.type ?? null;

    const mkRow = (mode: RollMode) => {
      const { toHitTotal, toHitDetail, crit } = computeToHit({
        action: act,
        perActionMods,
        perTurnMods,
        mode,
        preferences,
        rng,
      });

      const pieces: RowDamagePiece[] = [];

      // base action damage
      for (const d of act.factorsJson.damage ?? []) {
        pieces.push(
          computeDamagePiece({
            line: d,
            inheritedType: null,
            crit,
            critRules: preferences.critRules ?? "5e-double",
            rng,
          })
        );
      }

      // per-action modifiers (inherit type when null)
      for (const m of perActionMods) {
        if (!m.factorsJson.eachAttack) continue;
        for (const d of m.factorsJson.damage ?? []) {
          const inheritedType = d.type === null ? firstActionType : null;
          const displayLabel =
            d.type === null
              ? d.source?.trim() || "base"
              : d.type || "Undefined";
          const piece = computeDamagePiece({
            line: d,
            inheritedType,
            crit,
            critRules: preferences.critRules ?? "5e-double",
            rng,
          });
          pieces.push({ ...piece, label: displayLabel });
        }
      }

      const row: ActionRow = {
        kind: "action",
        actionId: act.id,
        name: act.name,
        mode,
        toHitTotal,
        toHitDetail,
        crit: preferences.critRules ? crit : false,
        damage: pieces,
        selected: true,
      };
      return row;
    };

    repeat(tally.normal, () => rows.push(mkRow("normal")!));
    repeat(tally.adv, () => rows.push(mkRow("adv")!));
    repeat(tally.disadv, () => rows.push(mkRow("disadv")!));
  });

  // per-turn rows (no to-hit)
  for (const m of perTurnMods) {
    if (m.factorsJson.eachAttack) continue;
    const pieces: RowDamagePiece[] = [];
    for (const d of m.factorsJson.damage ?? []) {
      const label =
        d.type === null ? d.source?.trim() || "base" : d.type || "Undefined";
      pieces.push(
        computeDamagePiece({
          line: d,
          inheritedType: null,
          crit: false,
          critRules: preferences.critRules ?? "5e-double",
          rng,
          labelOverride: label,
        })
      );
    }
    rows.push({
      kind: "perTurn",
      modifierId: m.id,
      name: m.name,
      damage: pieces,
      selected: true,
    });
  }

  // initial totals (selected by default)
  const totals = totalsFromRows(rows);

  return {
    id: `grp_${now}_${Math.floor(rng() * 1e6)}`,
    timestamp: now,
    tz,
    rows,
    totals,
  };
}

/* ----------------- helpers ----------------- */

function totalsFromRows(rows: (ActionRow | PerTurnRow)[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.selected) continue;
    for (const p of r.damage) {
      const key = p.type ?? "Undefined";
      map.set(key, (map.get(key) ?? 0) + p.total);
    }
  }
  const byType = Array.from(map.entries()).map(([type, amount]) => ({
    type,
    amount,
  }));
  const sum = byType.reduce((a, b) => a + b.amount, 0);
  return { sum, byType };
}

function computeToHit(args: {
  action: ActionRecord;
  perActionMods: ModifierRecord[];
  perTurnMods: ModifierRecord[];
  mode: RollMode;
  preferences: CharacterPreferences;
  rng: () => number;
}): { toHitTotal: number; toHitDetail: string; crit: boolean } {
  const { action, perActionMods, perTurnMods, mode, preferences, rng } = args;

  const advEnabled = preferences.advRules !== false;

  const base = action.factorsJson.toHit ?? {
    static: 0,
    signStatic: 1 as Signed,
    dice: [],
  };
  const baseStatic = (base.static ?? 0) * (base.signStatic ?? 1);

  const impacts = [...perActionMods, ...perTurnMods].map(
    (m) =>
      m.factorsJson.attackImpact ?? {
        static: 0,
        signStatic: 1 as Signed,
        dice: [],
      }
  );

  const { chosenSum, detail, crit } = sumToHitWithAdv({
    toHitDice: base.dice ?? [],
    impactsDice: impacts.flatMap((i) => i.dice ?? []),
    canCrit: preferences.critRules !== null,
    critThreshold: preferences.critThreshold ?? 20,
    mode: advEnabled ? mode : "normal",
    rng,
  });

  const impactsStatic = impacts.reduce(
    (acc, i) => acc + (i.static ?? 0) * (i.signStatic ?? 1),
    0
  );
  const total = baseStatic + impactsStatic + chosenSum;
  const staticPart = baseStatic + impactsStatic;
  const staticLabel = staticPart !== 0 ? ` (+${staticPart})` : "";

  return {
    toHitTotal: total,
    toHitDetail: `${detail}${staticLabel}`,
    crit: preferences.critRules ? crit : false,
  };
}

function computeDamagePiece(args: {
  line: ActionDamageLine | ModifierDamageLine;
  inheritedType: string | null;
  crit: boolean;
  critRules: CritRules;
  rng: () => number;
  labelOverride?: string;
}): RowDamagePiece {
  const { line, inheritedType, crit, critRules, rng, labelOverride } = args;
  const signStatic = line.signStatic ?? 1;
  const staticVal = (line.static ?? 0) * signStatic;

  const dice = line.dice ?? [];
  const first = rollDiceList(dice, rng);
  let diceTotal = first.total;

  let critText = "";
  if (crit && critRules === "5e-double" && dice.length > 0) {
    const extra = rollDiceList(dice, rng);
    diceTotal += extra.total;
    critText = ` + Crit: ${extra.desc}`;
  }

  const total = staticVal + diceTotal;

  const typeForTotals =
    line.type === null ? inheritedType ?? null : line.type ?? null;
  const label =
    labelOverride ??
    (line.type === null
      ? inheritedType ?? "Undefined"
      : line.type || "Undefined");

  const descStatic = line.static
    ? ` (+${(line.static ?? 0) * (line.signStatic ?? 1)})`
    : "";
  const detail = `${first.desc}${descStatic}${critText}`.trim();

  return { type: typeForTotals, label, total, detail };
}

function rollOnce(size: DieSize, rng: () => number): number {
  return 1 + Math.floor(rng() * size);
}

function rollDice(count: number, size: DieSize, rng: () => number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) arr.push(rollOnce(size, rng));
  return arr;
}

function rollDiceList(
  list: DiceEntry[],
  rng: () => number
): { total: number; parts: number[]; desc: string } {
  let total = 0;
  const parts: number[] = [];
  const chunks: string[] = [];

  for (const d of list) {
    const sign = d.signDice ?? 1;
    const rolls = rollDice(d.count, d.size, rng);
    const sum = rolls.reduce((a, b) => a + b, 0) * sign;
    total += sum;
    parts.push(sum);
    chunks.push(`Rolled ${d.count}d${d.size} → ${rolls.join(", ")}`);
  }

  const desc = chunks.length ? chunks.join("; ") : "Flat damage.";
  return { total, parts, desc };
}

function sumToHitWithAdv(args: {
  toHitDice: DiceEntryToHit[];
  impactsDice: DiceEntry[];
  canCrit: boolean;
  critThreshold: number;
  mode: RollMode;
  rng: () => number;
}): { chosenSum: number; detail: string; crit: boolean } {
  const { toHitDice, impactsDice, canCrit, critThreshold, mode, rng } = args;

  let chosenSum = 0;
  let crit = false;
  const detailBits: string[] = [];

  const choose = (
    size: DieSize,
    count: number,
    sign: Signed,
    allowCrit: boolean
  ) => {
    const picks: number[] = [];
    for (let i = 0; i < count; i++) {
      if (mode === "normal") {
        const r = rollOnce(size, rng);
        picks.push(r);
        if (allowCrit && size === 20 && r >= critThreshold) crit = true;
      } else {
        const a = rollOnce(size, rng);
        const b = rollOnce(size, rng);
        const better = Math.max(a, b);
        const worse = Math.min(a, b);
        const chosen = mode === "adv" ? better : worse;
        detailBits.push(`${worse} or ${better}`);
        picks.push(chosen);
        if (allowCrit && size === 20 && chosen >= critThreshold) crit = true;
      }
    }
    return picks.reduce((s, v) => s + v, 0) * sign;
  };

  // base to-hit dice
  for (const d of toHitDice ?? []) {
    const sign = d.signDice ?? 1;
    const allowCrit = !!d.canCrit && canCrit && d.size === 20;
    chosenSum += choose(d.size, d.count, sign, allowCrit);
    if (mode === "normal") detailBits.push(""); // keep index alignment; not shown
  }

  // attackImpact dice (never crit)
  for (const d of impactsDice ?? []) {
    const sign = d.signDice ?? 1;
    chosenSum += choose(d.size, d.count, sign, false);
  }

  let detail = "0";
  if (mode === "normal") detail = String(chosenSum);
  else {
    const pairs = detailBits.filter(Boolean);
    detail = pairs.length ? pairs[pairs.length - 1] : String(chosenSum);
  }

  return { chosenSum, detail, crit };
}

function repeat(n: number, fn: () => void) {
  for (let i = 0; i < n; i++) fn();
}

// re-export for consumers that want to recompute totals after selection toggles
export function recomputeTotals(rows: (ActionRow | PerTurnRow)[]) {
  return totalsFromRows(rows);
}
