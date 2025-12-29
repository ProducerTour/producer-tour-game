import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating achievement role restrictions...');

  // Revenue/Writer-only achievements (names from actual database)
  const writerOnlyAchievements = [
    'First Earnings',      // $100 revenue
    'Rising Star',         // $1,000 revenue
    'Professional',        // $10,000 revenue
    'Elite Producer',      // $50,000 revenue
    'Connected',           // Stripe connected
    'First Steps',         // First work submission
  ];

  // Update revenue/writer achievements to have roleRestriction: 'WRITER'
  for (const name of writerOnlyAchievements) {
    const achievement = await prisma.achievement.findFirst({
      where: { name }
    });

    if (achievement) {
      const currentCriteria = achievement.criteria as any || {};
      const updatedCriteria = { ...currentCriteria, roleRestriction: 'WRITER' };

      await prisma.achievement.update({
        where: { id: achievement.id },
        data: { criteria: updatedCriteria }
      });
      console.log(`  ✅ Updated "${name}" with roleRestriction: WRITER`);
    } else {
      console.log(`  ⚠️ Achievement "${name}" not found`);
    }
  }

  // Note: Customer-only achievements don't exist in the database yet
  // They can be added later via the seed script

  console.log('\n✅ Achievement role restrictions updated!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
