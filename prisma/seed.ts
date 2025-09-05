/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    },
  });

  // Sample character
  const character = await prisma.character.upsert({
    where: { id: "seed-char-1" },
    update: {},
    create: {
      id: "seed-char-1",
      name: "Aria the Bold",
      avatarUrl: null,
      userId: user.id,
    },
  });

  // Action with factorsJson (to-hit + damage)
  const action = await prisma.action.upsert({
    where: { id: "seed-action-1" },
    update: {},
    create: {
      id: "seed-action-1",
      characterId: character.id,
      name: "Longsword Slash",
      favorite: true,
      factorsJson: {
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
      },
    },
  });

  // Modifier with factorsJson (attackImpact + optional damage)
  const modifier = await prisma.actionModifier.upsert({
    where: { id: "seed-mod-1" },
    update: {},
    create: {
      id: "seed-mod-1",
      characterId: character.id,
      name: "Bless",
      favorite: false,
      factorsJson: {
        eachAttack: true,
        conditions: { spell: true },
        attackImpact: {
          static: 0,
          signStatic: 1,
          dice: [{ count: 1, size: 4, signDice: 1 }],
        },
        damage: [],
        favorite: false,
      },
    },
  });

  console.log("Seeded:", {
    user: user.email,
    character: character.name,
    action: action.name,
    modifier: modifier.name,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
