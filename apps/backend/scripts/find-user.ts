import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function findUser() {
  const searchTerm = process.argv[2] || 'eraldo';

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      },
      take: 10
    });

    if (users.length === 0) {
      console.log(`No users found matching: ${searchTerm}`);
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach(u => {
        console.log(`  ${u.firstName || ''} ${u.lastName || ''}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Role: ${u.role}`);
        console.log(`  ID: ${u.id}`);
        console.log(`  Created: ${u.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUser();
