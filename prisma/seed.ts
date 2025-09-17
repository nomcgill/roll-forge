/* eslint-disable no-console */
// prisma/seed.ts
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Target the same user you log in as.
  //    Add to .env.local:  SEED_USER_EMAIL=your-login-email@example.com
  const seedEmail = process.env.SEED_USER_EMAIL;
  if (!seedEmail) {
    throw new Error(
      "SEED_USER_EMAIL is not set. Add SEED_USER_EMAIL to .env.local (use the same email you sign in with)."
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: seedEmail },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new Error(
      `No user found for ${seedEmail}. Sign in once with that email, then re-run "yarn db:seed".`
    );
  }

  // 2) Character: keep exactly one Aria (stable id). Do NOT touch preferences.
  const character = await prisma.character.upsert({
    where: { id: "seed-char-1" },
    update: {
      userId: user.id,
      name: "Aria the Bold - Seeded",
      avatarUrl: null,
      preferences: { theme: "amethyst" } as Prisma.InputJsonValue,
    },
    create: {
      id: "seed-char-1",
      userId: user.id,
      name: "Aria the Bold - Seeded",
      avatarUrl: null,
      preferences: { theme: "amethyst" } as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, userId: true },
  });

  // 3) Action with factorsJson (to-hit + damage)
  const ACTION_FACTORS: Prisma.InputJsonObject = {
    conditions: { wielding: "weapon", distance: "melee" },
    toHit: {
      static: 5,
      signStatic: 1,
      dice: [{ count: 1, size: 20, signDice: 1, canCrit: true }],
    },
    damage: [
      {
        type: "slashing",
        static: 3,
        signStatic: 1,
        dice: [{ count: 1, size: 8, signDice: 1 }],
      },
    ],
    favorite: true,
  };

  const action = await prisma.action.upsert({
    where: { id: "seed-action-1" },
    update: {
      characterId: character.id,
      name: "Longsword Slash",
      favorite: true,
      factorsJson: ACTION_FACTORS as Prisma.InputJsonValue,
    },
    create: {
      id: "seed-action-1",
      characterId: character.id,
      name: "Longsword Slash",
      favorite: true,
      factorsJson: ACTION_FACTORS as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, characterId: true },
  });

  // 4) Modifier with factorsJson (attackImpact + optional damage)
  const MOD_FACTORS: Prisma.InputJsonObject = {
    eachAttack: true,
    conditions: { spell: true },
    attackImpact: {
      static: 0,
      signStatic: 1,
      dice: [{ count: 1, size: 4, signDice: 1 }],
    },
    damage: [],
    favorite: false,
  };

  const modifier = await prisma.actionModifier.upsert({
    where: { id: "seed-mod-1" },
    update: {
      characterId: character.id,
      name: "Bless",
      favorite: false,
      factorsJson: MOD_FACTORS as Prisma.InputJsonValue,
    },
    create: {
      id: "seed-mod-1",
      characterId: character.id,
      name: "Bless",
      favorite: false,
      factorsJson: MOD_FACTORS as Prisma.InputJsonValue,
    },
    select: { id: true, name: true, characterId: true },
  });

  console.log("Seed complete:");
  console.log({
    user: user.email,
    character,
    action,
    modifier,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
