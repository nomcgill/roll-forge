export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;
export type Signed = 1 | -1;

export type ToHitDie = {
  count: number;
  size: DieSize;
  signDice?: Signed;
  canCrit?: boolean;
};

export type ActionFactors = {
  conditions?: {
    wielding?: "weapon" | "unarmed";
    distance?: "melee" | "ranged";
    spell?: boolean;
  };
  toHit?: {
    static?: number;
    signStatic?: Signed;
    dice?: ToHitDie[];
  };
  damage: Array<{
    type: string | null; // null = "None (base)" → inherits first action type
    static?: number;
    signStatic?: Signed;
    dice?: Array<{ count: number; size: DieSize; signDice?: Signed }>;
  }>;
  favorite?: boolean;
};

export type ActionModifierFactors = {
  eachAttack: boolean; // true = per-action, false = per-turn
  conditions?: ActionFactors["conditions"];
  attackImpact?: {
    static?: number;
    signStatic?: Signed;
    dice?: Array<{ count: number; size: DieSize; signDice?: Signed }>;
  };
  damage: Array<{
    type: string | null; // null allowed ONLY when eachAttack=true
    source?: string; // <=18 chars; shows when type is null
    static?: number;
    signStatic?: Signed;
    dice?: Array<{ count: number; size: DieSize; signDice?: Signed }>;
  }>;
  favorite?: boolean;
};

export type CharacterPreferences = {
  followsAdvantageRules: boolean;
  critRules: "5e-double-damage-dice" | null;
  critThreshold: number; // 0–20
  uniqueDamageTypes: string[];
};

export type CharacterRecord = {
  id: string;
  name?: string | null;
  preferences?: CharacterPreferences | null;
};

export type ActionRecord = {
  id: string;
  characterId: string;
  name: string;
  favorite: boolean;
  factorsJson: ActionFactors;
};

export type ModifierRecord = {
  id: string;
  characterId: string;
  name: string;
  favorite: boolean;
  factorsJson: ActionModifierFactors;
};

// ----- Tally union + guards -----
export type AddTally = { add: number };
export type AdvTally = { disadv: number; normal: number; adv: number };
export type Tally = AddTally | AdvTally;

export function isAddTally(t: Tally): t is AddTally {
  return (t as AddTally).add !== undefined;
}
export function isAdvTally(t: Tally): t is AdvTally {
  return (
    (t as AdvTally).disadv !== undefined &&
    (t as AdvTally).normal !== undefined &&
    (t as AdvTally).adv !== undefined
  );
}

export function emptyTally(followsAdvantageRules: boolean): Tally {
  return followsAdvantageRules ? { disadv: 0, normal: 0, adv: 0 } : { add: 0 };
}
