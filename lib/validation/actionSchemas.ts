import { z } from "zod";

/** helpers */
const Signed = z.union([z.literal(1), z.literal(-1)]); // +1 | -1
const DieSize = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(20),
  z.literal(100),
]);

const MAX_DICE_ROWS = 10;
const MAX_DAMAGE_LINES = 10;

/** Dice entries */
const DiceEntryForActionToHit = z
  .object({
    count: z.number().int().min(1).max(99),
    size: DieSize,
    signDice: Signed.default(1),
    canCrit: z.boolean().optional(), // UI ensures only for d20 when critRules != null
  })
  .superRefine((val, ctx) => {
    if (val.canCrit && val.size !== 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["canCrit"],
        message: "canCrit is only allowed for d20",
      });
    }
  });

const DiceEntryNoCrit = z.object({
  count: z.number().int().min(1).max(99),
  size: DieSize,
  signDice: Signed.default(1),
  // no canCrit here
});

/** Common: conditions */
const Conditions = z
  .object({
    wielding: z.enum(["weapon", "unarmed"]).optional(),
    distance: z.enum(["melee", "ranged"]).optional(),
    spell: z.boolean().optional(),
  })
  .partial();

/** ACTION: factorsJson */
const ActionDamageLine = z.object({
  type: z.string().max(18).nullable(), // null allowed; shows as "Undefined" in totals
  static: z.number().int().optional().default(0),
  signStatic: Signed.default(1),
  dice: z.array(DiceEntryNoCrit).max(MAX_DICE_ROWS).optional().default([]),
});

const ActionFactors = z.object({
  conditions: Conditions.optional().default({}),
  toHit: z
    .object({
      static: z.number().int().optional().default(0),
      signStatic: Signed.default(1),
      dice: z
        .array(DiceEntryForActionToHit)
        .max(MAX_DICE_ROWS)
        .optional()
        .default([]),
    })
    .superRefine((v, ctx) => {
      // must have either static != 0 or at least one die
      const hasSomething = (v.static ?? 0) !== 0 || (v.dice?.length ?? 0) > 0;
      if (!hasSomething) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dice"],
          message:
            "Provide at least one die or a non-zero static bonus for to-hit",
        });
      }
    }),
  damage: z
    .array(ActionDamageLine)
    .max(MAX_DAMAGE_LINES)
    .optional()
    .default([]),
  favorite: z.boolean().optional().default(false),
});

/** MODIFIER: factorsJson */
const ModifierDamageLine = z.object({
  type: z.string().max(18).nullable(), // null allowed ONLY when eachAttack = true
  source: z.string().max(18).optional(),
  static: z.number().int().optional().default(0),
  signStatic: Signed.default(1),
  dice: z.array(DiceEntryNoCrit).max(MAX_DICE_ROWS).optional().default([]),
});

const ActionModifierFactors = z
  .object({
    eachAttack: z.boolean().default(true),
    conditions: Conditions.optional().default({}),
    attackImpact: z.object({
      static: z.number().int().optional().default(0),
      signStatic: Signed.default(1),
      dice: z.array(DiceEntryNoCrit).max(MAX_DICE_ROWS).optional().default([]),
    }),
    damage: z
      .array(ModifierDamageLine)
      .max(MAX_DAMAGE_LINES)
      .optional()
      .default([]),
    favorite: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    // Enforce: when Per Turn (eachAttack=false), damage.type cannot be null ("None (base)" disallowed)
    if (!v.eachAttack) {
      v.damage?.forEach((row, idx) => {
        if (row.type === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["damage", idx, "type"],
            message:
              'For "Per Turn" modifiers, pick a damage type (cannot be "None (base)")',
          });
        }
      });
    }
  });

/** Top-level payloads */
export const actionCreateSchema = z.object({
  name: z.string().min(1, "Required").max(25, "Must be ≤ 25 characters"),
  favorite: z.boolean().optional().default(false),
  factorsJson: ActionFactors,
});

export const actionModifierCreateSchema = z.object({
  name: z.string().min(1, "Required").max(25, "Must be ≤ 25 characters"),
  favorite: z.boolean().optional().default(false),
  factorsJson: ActionModifierFactors,
});

/** also export the factor schemas in case server routes need them */
export type ActionFactorsType = z.infer<typeof ActionFactors>;
export type ActionModifierFactorsType = z.infer<typeof ActionModifierFactors>;
