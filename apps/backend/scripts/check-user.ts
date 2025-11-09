import { prisma } from '../src/lib/prisma';

async function checkUser() {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: 'collabs',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    console.log('Found users:', JSON.stringify(users, null, 2));

    // Also check exact match with different cases
    const exactLower = await prisma.user.findUnique({
      where: { email: 'collabsWnateb@gmail.com' },
      select: { id: true, email: true },
    });
    console.log('Lowercase match:', exactLower);

    const exactMixed = await prisma.user.findUnique({
      where: { email: 'CollabsWNateB@Gmail.Com' },
      select: { id: true, email: true },
    });
    console.log('Mixed case match:', exactMixed);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
