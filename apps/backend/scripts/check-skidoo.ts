/**
 * Diagnostic script to check Skidoo placement and collaborators
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkSkidoo() {
  console.log('\n=== CHECKING "SKIDOO" PLACEMENT ===\n');

  const placement = await prisma.placement.findFirst({
    where: { title: { contains: 'Skidoo', mode: 'insensitive' } },
    include: {
      credits: {
        include: {
          user: {
            include: { producer: true }
          }
        }
      }
    }
  });

  if (!placement) {
    console.log('❌ Skidoo placement NOT FOUND');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Placement found:', placement.title, '(' + placement.status + ')');
  console.log('   Credits:', placement.credits.length, '\n');

  for (const credit of placement.credits) {
    console.log('   ' + credit.firstName + ' ' + credit.lastName + ':');
    console.log('      userId:', credit.userId || 'NULL ❌');
    console.log('      isExternalWriter:', credit.isExternalWriter);
    console.log('      credit.pro:', credit.pro || 'NOT SET');
    console.log('      splitPercentage:', credit.splitPercentage + '%');
    if (credit.user) {
      console.log('      user.writerProAffiliation:', credit.user.writerProAffiliation || 'NOT SET');
      console.log('      user.producer.proAffiliation:', credit.user.producer?.proAffiliation || 'NO PRODUCER');
    }

    // Check if would pass filters
    const hasUserId = !!credit.userId;
    const notExternal = !credit.isExternalWriter;
    const hasSplit = Number(credit.splitPercentage) > 0;
    const writerPro = credit.pro || credit.user?.writerProAffiliation || credit.user?.producer?.proAffiliation;
    const isBmi = writerPro === 'BMI';

    const wouldPassBmi = hasUserId && notExternal && hasSplit && isBmi;
    console.log('      → Would pass BMI filter:', wouldPassBmi ? '✅ YES' : '❌ NO');
    if (!wouldPassBmi) {
      const reasons = [];
      if (!hasUserId) reasons.push('no userId');
      if (!notExternal) reasons.push('isExternalWriter=true');
      if (!hasSplit) reasons.push('no split');
      if (!isBmi) reasons.push('PRO is ' + (writerPro || 'none') + ', not BMI');
      console.log('         Reasons:', reasons.join(', '));
    }
    console.log('');
  }

  // Also check if Nathaniel exists as a user
  console.log('\n=== CHECKING NATHANIEL USER ===\n');
  const nathaniel = await prisma.user.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Nathaniel', mode: 'insensitive' } },
        { firstName: { contains: 'Nate', mode: 'insensitive' } }
      ]
    },
    include: { producer: true }
  });

  if (nathaniel) {
    console.log('✅ User found:');
    console.log('   ID:', nathaniel.id);
    console.log('   Name:', nathaniel.firstName, nathaniel.lastName);
    console.log('   Role:', nathaniel.role);
    console.log('   writerProAffiliation:', nathaniel.writerProAffiliation || 'NOT SET');
    console.log('   Producer proAffiliation:', nathaniel.producer?.proAffiliation || 'NO PRODUCER');
  } else {
    console.log('❌ Nathaniel NOT FOUND in users table');
  }

  await prisma.$disconnect();
}

checkSkidoo().catch(console.error);
