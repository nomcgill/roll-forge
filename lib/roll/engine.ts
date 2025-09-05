// lib/roll/engine.ts
import type {
  ActionRecord,
  ModifierRecord,
  CharacterPreferences,
  RollMode,
  Tally,
  DieSize,
  Signed,
} from "@/components/roll/types";

/* ────────────────────────────────────────────────────────────
 * History output consumed by HistoryPane
 * ──────────────────────────────────────────────────────────── */
export type HistoryDamageDetail = {
  amount: number;
  type: string | null; // null → “Undefined”
  typeLabel: string; // precomputed label
  source?: string; // user text, shown in details; ignored in totals
  parts: string[]; // granular explanation (dice/static)
};

export type HistoryRow = {
  id: string;
  kind: "action" | "perTurnModifier";
  name: string;
  mode?: RollMode; // only for action rows
  successTotal?: number | null; // null/undefined for perTurnModifier
  successDetail?: string; // compact math string
  crit?: boolean;
  labels: string[]; // “Advantage”, “Crit”, etc. plus to-hit modifier summary
  damage: HistoryDamageDetail[]; // order preserved
  selected: boolean; // rows start selected
};

export type HistoryGroup = {
  id: string;
  timestampIso: string;
  timestampLabel: string; // "1:12 PM"
  rows: HistoryRow[];
  totals: {
    grand: number;
    byType: { type: string | null; label: string; total: number }[];
  };
};

/* ────────────────────────────────────────────────────────────
 * Internal shapes mirroring factorsJson
 * ──────────────────────────────────────────────────────────── */
type DieSpec = {
  count: number;
  size: DieSize;
  signDice: Signed;
  /** to-hit only */
  canCrit?: boolean;
};

type ToHitSpec = {
  static?: number;
  signStatic?: Signed;
  dice?: DieSpec[];
};

type DamageLineSpec = {
  type: string | null; // null → “inherit first action damage type” (for per-action modifiers)
  source?: string; // user note (only for per-action)
  static?: number;
  signStatic?: Signed;
  dice?: DieSpec[];
};

type ConditionsSpec = {
  wielding?: "weapon" | "unarmed" | false;
  distance?: "melee" | "ranged" | false;
  spell?: boolean;
};

type ActionFactors = {
  toHit: ToHitSpec;
  damage: DamageLineSpec[];
  conditions?: ConditionsSpec;
};

type ActionModifierFactors = {
  eachAttack: boolean; // true → per-action; false → per-turn
  attackImpact?: ToHitSpec; // affects successTotal only; never crits
  damage?: DamageLineSpec[]; // extra damage lines
  conditions?: ConditionsSpec;
};

/* ────────────────────────────────────────────────────────────
 * Utils
 * ──────────────────────────────────────────────────────────── */
const labelForType = (t: string | null) => (t == null ? "Undefined" : t);

const fmtTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const rollOne = (size: number, rng: () => number) =>
  1 + Math.floor(rng() * size);

/** Roll to-hit dice with per-die pairing for adv/disadv (when advRules on). */
function rollToHitDice(
  dice: DieSpec[] | undefined,
  mode: RollMode,
  advRules: boolean,
  rng: () => number
) {
  const picked: number[] = [];
  const pairsShown: { a: number; b: number }[] = []; // for pretty single-d20 display
  const perDieChosenSigned: number[] = [];

  (dice ?? []).forEach((spec) => {
    for (let i = 0; i < spec.count; i++) {
      if (advRules && (mode === "adv" || mode === "disadv")) {
        const a = rollOne(spec.size, rng);
        const b = rollOne(spec.size, rng);
        const v = mode === "adv" ? Math.max(a, b) : Math.min(a, b);
        picked.push(v);
        perDieChosenSigned.push(v * spec.signDice);
        pairsShown.push({ a, b });
      } else {
        const v = rollOne(spec.size, rng);
        picked.push(v);
        perDieChosenSigned.push(v * spec.signDice);
      }
    }
  });

  return {
    sum: perDieChosenSigned.reduce((A, B) => A + B, 0),
    picked,
    pairsShown,
  };
}

/** Attack impact: rolled once per action row and added to the chosen result (cannot crit). */
function sumAttackImpact(impact: ToHitSpec | undefined, rng: () => number) {
  if (!impact) return { total: 0, parts: [] as string[] };

  const s = (impact.static ?? 0) * (impact.signStatic ?? 1);
  let diceTotal = 0;
  const parts: string[] = [];

  (impact.dice ?? []).forEach((d) => {
    const rolls: number[] = [];
    for (let i = 0; i < d.count; i++) {
      const v = rollOne(d.size, rng);
      rolls.push(v);
      diceTotal += v * d.signDice;
    }
    parts.push(
      `Rolled ${d.count}d${d.size} → ${rolls.join(", ")}${
        d.signDice === -1 ? " (−)" : ""
      }`
    );
  });

  const total = s + diceTotal;
  const pieces = [
    ...(s !== 0 ? [`${s > 0 ? "+" : ""}${s} static`] : []),
    ...parts,
  ];
  return { total, parts: pieces };
}

/** Damage line roll; on crit (5e), double rolled dice only (not static). */
function rollDamageLine(
  line: DamageLineSpec,
  crit: boolean,
  rng: () => number
): HistoryDamageDetail {
  const s = (line.static ?? 0) * (line.signStatic ?? 1);
  let diceTotal = 0;
  const parts: string[] = [];

  (line.dice ?? []).forEach((d) => {
    const rollSet = () => {
      const rolls: number[] = [];
      let subtotal = 0;
      for (let i = 0; i < d.count; i++) {
        const v = rollOne(d.size, rng);
        rolls.push(v);
        subtotal += v * d.signDice;
      }
      parts.push(
        `Rolled ${d.count}d${d.size} → ${rolls.join(", ")}${
          d.signDice === -1 ? " (−)" : ""
        }`
      );
      return subtotal;
    };
    diceTotal += rollSet();
    if (crit) diceTotal += rollSet();
  });

  const amount = s + diceTotal;
  return {
    amount,
    type: line.type ?? null,
    typeLabel: labelForType(line.type ?? null),
    source: line.source,
    parts: parts.length ? parts : [s !== 0 ? "Flat damage." : "—"],
  };
}

function computeTotals(rows: HistoryRow[]) {
  const byTypeMap = new Map<string | null, number>();
  let grand = 0;

  rows.forEach((r) => {
    if (!r.selected) return;
    r.damage.forEach((d) => {
      grand += d.amount;
      byTypeMap.set(d.type, (byTypeMap.get(d.type) ?? 0) + d.amount);
    });
  });

  const byType = Array.from(byTypeMap.entries()).map(([type, total]) => ({
    type,
    label: labelForType(type),
    total,
  }));

  return { grand, byType };
}

/** expose a helper the UI can call after row (de)selection */
export function recomputeTotals(rows: HistoryRow[]) {
  return computeTotals(rows);
}

/* ────────────────────────────────────────────────────────────
 * Public: execute a group
 * ──────────────────────────────────────────────────────────── */
export function executeActionGroup(args: {
  actions: ActionRecord[];
  modifiers: ModifierRecord[];
  preferences: CharacterPreferences;
  selection: {
    actionTallies: Record<string, Tally>;
    perActionModifierIds: string[];
    perTurnModifierIds: string[];
  };
  rng?: () => number; // optional for testing
}): HistoryGroup {
  const {
    actions,
    modifiers,
    preferences,
    selection: { actionTallies, perActionModifierIds, perTurnModifierIds },
  } = args;
  const rng = args.rng ?? Math.random;

  const advRules = preferences.advRules !== false;
  const critActive = preferences.critRules;
  const critThreshold =
    typeof preferences.critThreshold === "number"
      ? preferences.critThreshold
      : 20;

  const now = new Date();
  const rows: HistoryRow[] = [];
  let rowCounter = 0;

  const perTurnMods = modifiers.filter(
    (m) => !m.factorsJson.eachAttack && perTurnModifierIds.includes(m.id)
  );
  const perActionMods = modifiers.filter(
    (m) => m.factorsJson.eachAttack && perActionModifierIds.includes(m.id)
  );

  // Aggregate per-turn attackImpact once; added to every action row
  const perTurnImpactAgg = sumAttackImpact(
    mergeToHitSpecs(perTurnMods.map((m) => m.factorsJson.attackImpact)),
    rng
  );

  // Build action rows from tallies
  actions.forEach((a) => {
    const factors = a.factorsJson as ActionFactors;
    const tally = actionTallies[a.id] ?? { adv: 0, normal: 0, disadv: 0 };

    (["adv", "normal", "disadv"] as const).forEach((mode) => {
      let count = tally[mode];
      if (!advRules && (mode === "adv" || mode === "disadv")) count = 0;

      for (let i = 0; i < count; i++) {
        const toHit = factors.toHit ?? { static: 0, signStatic: 1, dice: [] };
        const toHitRoll = rollToHitDice(toHit.dice, mode, advRules, rng);

        const baseStatic = (toHit.static ?? 0) * (toHit.signStatic ?? 1);
        const perActionImpact = sumAttackImpact(
          mergeToHitSpecs(perActionMods.map((m) => m.factorsJson.attackImpact)),
          rng
        );
        const impactTotal = perActionImpact.total + perTurnImpactAgg.total;

        const successTotal = toHitRoll.sum + baseStatic + impactTotal;

        // labels (Adv/Disadv + to-hit modifier summary if any)
        const labels: string[] = [];
        if (mode === "adv") labels.push("Advantage");
        if (mode === "disadv") labels.push("Disadvantage");
        if (impactTotal !== 0) {
          labels.push(
            `${impactTotal > 0 ? "+" : ""}${impactTotal} to hit (modifiers)`
          );
        }

        // success detail: show pair nicely when exactly one d20 canCrit
        const primaryD20 =
          (toHit.dice ?? [])
            .filter((d) => d.size === 20 && (d.canCrit ?? true))
            .reduce((acc, d) => acc + d.count, 0) === 1;

        let successDetail = "";
        if (
          advRules &&
          (mode === "adv" || mode === "disadv") &&
          primaryD20 &&
          toHitRoll.pairsShown.length >= 1
        ) {
          const { a: A, b: B } = toHitRoll.pairsShown[0];
          successDetail = `${A} or ${B} (${fmtSigned(
            baseStatic + impactTotal
          )})`;
        } else {
          const natural = toHitRoll.picked.reduce((sum, v, idx) => {
            const sd = (toHit.dice ?? [])[idx]?.signDice ?? 1;
            return sum + v * sd;
          }, 0);
          successDetail = `${natural} (${fmtSigned(baseStatic + impactTotal)})`;
        }

        // crit detection: only if active and there exists a d20 with canCrit true
        let crit = false;
        if (critActive) {
          const eligible = (toHit.dice ?? []).some(
            (d) => d.size === 20 && (d.canCrit ?? true)
          );
          if (eligible) {
            // compare the picked natural per die
            let ptr = 0;
            (toHit.dice ?? []).forEach((d) => {
              for (let j = 0; j < d.count; j++) {
                const val = toHitRoll.picked[ptr++];
                if (
                  d.size === 20 &&
                  (d.canCrit ?? true) &&
                  val >= critThreshold
                ) {
                  crit = true;
                }
              }
            });
            if (crit) labels.push("Crit");
          }
        }

        // damage: base action then per-action modifiers
        const damageLines: HistoryDamageDetail[] = [];
        const firstActionType: string | null =
          factors.damage?.[0]?.type ?? null;

        (factors.damage ?? []).forEach((line) => {
          damageLines.push(rollDamageLine(line, crit, rng));
        });

        perActionMods.forEach((m) => {
          (m.factorsJson.damage ?? []).forEach((line) => {
            const typeToUse =
              line.type === null ? firstActionType : line.type ?? null;
            const rolled = rollDamageLine(
              { ...line, type: typeToUse },
              crit,
              rng
            );
            if (line.type === null && line.source) {
              rolled.source = line.source; // show user note
            }
            damageLines.push(rolled);
          });
        });

        rows.push({
          id: `row-${++rowCounter}`,
          kind: "action",
          name: a.name,
          mode,
          successTotal,
          successDetail,
          crit,
          labels,
          damage: damageLines,
          selected: true,
        });
      }
    });
  });

  // one per-turn row (if any selected)
  if (perTurnMods.length) {
    const modDamage: HistoryDamageDetail[] = [];
    perTurnMods.forEach((m) => {
      (m.factorsJson.damage ?? []).forEach((line) => {
        modDamage.push(
          rollDamageLine(line, /*crit does not affect per-turn row*/ false, rng)
        );
      });
    });

    rows.push({
      id: `row-${++rowCounter}`,
      kind: "perTurnModifier",
      name: "+ Modifiers (Per Turn)",
      successTotal: null,
      successDetail: undefined,
      crit: false,
      labels: [],
      damage: modDamage,
      selected: true,
    });
  }

  const totals = computeTotals(rows);

  return {
    id: `group-${Date.now()}`,
    timestampIso: now.toISOString(),
    timestampLabel: fmtTime(now),
    rows,
    totals,
  };
}

/** merge many ToHitSpec fragments (sum statics, concat dice keeping signDice) */
function mergeToHitSpecs(specs: Array<ToHitSpec | undefined>) {
  const merged: ToHitSpec = { static: 0, signStatic: 1, dice: [] };
  specs.forEach((s) => {
    if (!s) return;
    merged.static =
      (merged.static ?? 0) + (s.static ?? 0) * (s.signStatic ?? 1);
    (s.dice ?? []).forEach((d) => (merged.dice as DieSpec[]).push({ ...d }));
  });
  return merged;
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}
