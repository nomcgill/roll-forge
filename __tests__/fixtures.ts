import type {
  ActionRecord,
  ActionFactors,
  ModifierRecord,
  ActionModifierFactors,
  CharacterPreferences,
  RollMode,
  Tally,
} from "@/components/roll/types";

export function makePrefs(
  partial?: Partial<CharacterPreferences>
): CharacterPreferences {
  return {
    advRules: true,
    critRules: "5e-double",
    critThreshold: 20,
    uniqueDamageTypes: [],
    ...partial,
  };
}

export function makeSimpleAction(
  id: string,
  name: string,
  opts?: {
    mode?: RollMode;
    toHitStatic?: number;
    damageDieSize?: 8 | 6 | 10 | 12;
    damageType?: string | null;
  }
): ActionRecord {
  const factors: ActionFactors = {
    toHit: {
      static: opts?.toHitStatic ?? 0,
      signStatic: 1,
      dice: [
        {
          count: 1,
          size: 20,
          signDice: 1,
          canCrit: true,
        },
      ],
    },
    damage: [
      {
        type: opts?.damageType ?? "Slashing",
        static: 0,
        signStatic: 1,
        dice: [
          {
            count: 1,
            size: opts?.damageDieSize ?? 8,
            signDice: 1,
          },
        ],
      },
    ],
  };
  return {
    id,
    characterId: "char-1",
    name,
    favorite: false,
    factorsJson: factors,
  };
}

export function makePerTurnModifier(
  id: string,
  name: string,
  opts?: { flatDamage?: number; type?: string | null }
): ModifierRecord {
  const factors: ActionModifierFactors = {
    eachAttack: false,
    damage: [
      {
        type: opts?.type ?? "Radiant",
        static: opts?.flatDamage ?? 1,
        signStatic: 1,
        dice: [],
      },
    ],
  };
  return {
    id,
    characterId: "char-1",
    name,
    favorite: false,
    factorsJson: factors,
  };
}

export function oneNormalTally(actionId: string): Record<string, Tally> {
  return { [actionId]: { normal: 1, adv: 0, disadv: 0 } };
}

export function rngFromSequence(seq: number[]) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i++;
    return v;
  };
}
