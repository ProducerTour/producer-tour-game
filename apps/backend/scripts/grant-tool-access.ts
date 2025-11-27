import { PrismaClient } from '../src/generated/client';

// Use DATABASE_URL from environment or pass as argument
const prisma = new PrismaClient();

async function grantToolAccess() {
  // Get email from command line argument or use default
  const userEmail = process.argv[2] || 'imraldoh@gmail.com';
  const toolId = 'type-beat-video-maker';
  const toolName = 'Type Beat Video Maker';
  const reason = 'Beta tester access';

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    });

    if (!user) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Role: ${user.role}`);

    // Check if already has access
    const existingAccess = await prisma.toolSubscription.findFirst({
      where: {
        userId: user.id,
        toolId,
        status: 'ACTIVE',
      }
    });

    if (existingAccess) {
      console.log(`User already has ${existingAccess.type} access to ${toolName}`);
      console.log(`Expires: ${existingAccess.expiresAt || 'Never'}`);
      process.exit(0);
    }

    // Grant access
    const subscription = await prisma.toolSubscription.create({
      data: {
        userId: user.id,
        toolId,
        toolName,
        type: 'ADMIN_GRANTED',
        status: 'ACTIVE',
        usesRemaining: 0,
        usesTotal: 0,
        grantReason: reason,
        expiresAt: null, // Permanent access
      }
    });

    console.log(`\n✅ Successfully granted ${toolName} access to ${user.email}`);
    console.log(`Subscription ID: ${subscription.id}`);
    console.log(`Type: ${subscription.type}`);
    console.log(`Expires: Never (permanent)`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

grantToolAccess();
