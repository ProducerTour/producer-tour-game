/**
 * Diagnostic script to check Alberto Delgado and DISTRIBUTION placement
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkAlberto() {
  console.log('\n=== CHECKING ALBERTO DELGADO ===\n');

  // Check user record
  const alberto = await prisma.user.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'Alberto', mode: 'insensitive' } },
        { lastName: { contains: 'Delgado', mode: 'insensitive' } }
      ]
    },
    include: { producer: true }
  });

  if (alberto) {
    console.log('✅ User found:');
    console.log('   ID:', alberto.id);
    console.log('   Name:', alberto.firstName, alberto.lastName);
    console.log('   Role:', alberto.role);
    console.log('   writerProAffiliation:', alberto.writerProAffiliation || 'NOT SET');
    console.log('   Producer proAffiliation:', alberto.producer?.proAffiliation || 'NO PRODUCER');
  } else {
    console.log('❌ Alberto Delgado NOT FOUND in users table');
  }

  // Check DISTRIBUTION placement
  console.log('\n=== CHECKING "DISTRIBUTION" PLACEMENT ===\n');

  const placement = await prisma.placement.findFirst({
    where: { title: { contains: 'DISTRIBUTION', mode: 'insensitive' } },
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

  if (placement) {
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

      const wouldPass = hasUserId && notExternal && hasSplit && isBmi;
      console.log('      → Would pass BMI filter:', wouldPass ? '✅ YES' : '❌ NO');
      if (!wouldPass) {
        const reasons = [];
        if (!hasUserId) reasons.push('no userId');
        if (!notExternal) reasons.push('isExternalWriter=true');
        if (!hasSplit) reasons.push('no split');
        if (!isBmi) reasons.push('PRO is ' + (writerPro || 'none') + ', not BMI');
        console.log('         Reasons:', reasons.join(', '));
      }
      console.log('');
    }
  } else {
    console.log('❌ "DISTRIBUTION" placement NOT FOUND');
  }

  await prisma.$disconnect();
}

checkAlberto().catch(console.error);
