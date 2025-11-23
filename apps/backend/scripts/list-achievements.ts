import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  const achievements = await prisma.achievement.findMany({
    orderBy: { category: 'asc' }
  });

  console.log(`Found ${achievements.length} achievements:\n`);

  for (const a of achievements) {
    const criteria = a.criteria as any;
    console.log(`- ${a.name} (${a.category})`);
    console.log(`  ID: ${a.id}`);
    console.log(`  Criteria: ${JSON.stringify(criteria)}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
