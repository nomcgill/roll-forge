// components/roll/types.ts
export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;
export type Signed = 1 | -1;

export type RollMode = "normal" | "adv" | "disadv";
export type Tally = { normal: number; adv: number; disadv: number };

export type CritRules = "5e-double" | null;

export type CharacterPreferences = {
  advRules?: boolean; // default true
  critRules: CritRules; // "5e-double" enables D&D 5e crits; null disables all crit logic/UI
  critThreshold: number; // default 20
  uniqueDamageTypes?: string[]; // custom per-character ontology
};

export type DiceEntryToHit = {
  count: number;
  size: DieSize;
  signDice: Signed;
  canCrit?: boolean; // only respected for d20
};

export type DiceEntry = {
  count: number;
  size: DieSize;
  signDice: Signed;
};

export type ActionDamageLine = {
  type: string | null; // null allowed for Actions ("Undefined" bucket in totals)
  static?: number;
  signStatic: Signed;
  dice?: DiceEntry[];
};

export type ModifierDamageLine = ActionDamageLine & {
  source?: string; // ≤18 chars; shown when type is null
};

export type ActionFactors = {
  conditions?: {
    wielding?: "weapon" | "unarmed";
    distance?: "melee" | "ranged";
    spell?: boolean;
  };
  toHit: {
    static?: number;
    signStatic: Signed;
    dice?: DiceEntryToHit[];
  };
  damage?: ActionDamageLine[];
  favorite?: boolean;
};

export type ActionModifierFactors = {
  eachAttack: boolean; // true=per-action, false=per-turn
  conditions?: {
    wielding?: "weapon" | "unarmed";
    distance?: "melee" | "ranged";
    spell?: boolean;
  };
  attackImpact?: {
    static?: number;
    signStatic: Signed;
    dice?: DiceEntry[]; // cannot crit; still respects adv/disadv pairing
  };
  damage?: ModifierDamageLine[];
  favorite?: boolean;
};

export type ActionRecord = {
  id: string;
  characterId: string;
  name: string;
  favorite: boolean;
  factorsJson: ActionFactors;
  createdAt?: string | Date;
};

export type ModifierRecord = {
  id: string;
  characterId: string;
  name: string;
  favorite: boolean;
  factorsJson: ActionModifierFactors;
  createdAt?: string | Date;
};

// History shapes
export type RowDamagePiece = {
  type: string | null; // totals bucket (show "Undefined" when null)
  label: string; // display name for this piece (e.g., "slashing" or modifier.source)
  total: number;
  detail: string; // tooltip-ish text: "Rolled 2d6 → 3, 3 (+6)"
};

export type ActionRow = {
  kind: "action";
  actionId: string;
  name: string;
  mode: RollMode; // normal | adv | disadv
  toHitTotal: number;
  toHitDetail: string; // e.g., "11 or 17 (+10)"
  crit: boolean;
  damage: RowDamagePiece[];
  selected: boolean;
};

export type PerTurnRow = {
  kind: "perTurn";
  modifierId: string;
  name: string;
  damage: RowDamagePiece[];
  selected: boolean;
};

export type HistoryGroup = {
  id: string;
  timestamp: number; // epoch ms
  tz: string; // IANA tz id when available
  rows: (ActionRow | PerTurnRow)[];
  totals: { sum: number; byType: { type: string; amount: number }[] };
};
