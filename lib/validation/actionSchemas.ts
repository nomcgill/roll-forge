import { z } from "zod";

const dieSize = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(20),
  z.literal(100),
]);

const signed = z.union([z.literal(1), z.literal(-1)]);

const diceEntry = z.object({
  count: z.number().int().positive(),
  size: dieSize,
  signDice: signed.optional(),
});

const toHitSchema = z.object({
  static: z.number().int().optional(),
  signStatic: signed.optional(),
  dice: z
    .array(
      diceEntry.extend({
        // canCrit only relevant for ACTION toHit; UI will gate to d20 when critRules enabled
        canCrit: z.boolean().optional(),
      })
    )
    .optional(),
});

const damageLineBase = z.object({
  type: z.string().min(1).nullable(), // null = "None (base)" (inherit first action type)
  static: z.number().int().optional(),
  signStatic: signed.optional(),
  dice: z.array(diceEntry).optional(),
});

export const actionCreateSchema = z.object({
  name: z.string().min(1).max(25),
  favorite: z.boolean().optional(),
  rollDetails: z.object({
    conditions: z
      .object({
        wielding: z.enum(["weapon", "unarmed"]).optional(),
        distance: z.enum(["melee", "ranged"]).optional(),
        spell: z.boolean().optional(),
      })
      .optional(),
    toHit: toHitSchema.optional(),
    damage: z
      .array(
        // For Actions, do not show "source" in UI, but allow it in payload harmlessly.
        damageLineBase.extend({
          source: z.string().max(18).optional(),
        })
      )
      .default([]),
    favorite: z.boolean().optional(),
  }),
});

export const actionModifierCreateSchema = z.object({
  name: z.string().min(1).max(25),
  favorite: z.boolean().optional(),
  rollDetails: z
    .object({
      eachAttack: z.boolean(), // true=per-action, false=per-turn
      conditions: z
        .object({
          wielding: z.enum(["weapon", "unarmed"]).optional(),
          distance: z.enum(["melee", "ranged"]).optional(),
          spell: z.boolean().optional(),
        })
        .optional(),
      attackImpact: z
        .object({
          static: z.number().int().optional(),
          signStatic: signed.optional(),
          dice: z.array(diceEntry).optional(), // cannot crit; no canCrit key here
        })
        .optional(),
      damage: z
        .array(
          damageLineBase.extend({
            source: z.string().max(18).optional(),
          })
        )
        .default([]),
      favorite: z.boolean().optional(),
    })
    .superRefine((val, ctx) => {
      // Enforce: type:null ("None (base)") allowed ONLY when eachAttack=true
      for (const [idx, line] of (val.damage ?? []).entries()) {
        if (line.type === null && !val.eachAttack) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'type:null ("None (base)") is only allowed when eachAttack=true',
            path: ["damage", idx, "type"],
          });
        }
      }
    }),
});
