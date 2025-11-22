import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { isUserOnline, emitToUser } from '../socket';

const router = Router();

// Get all contacts for the current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const contacts = await prisma.contact.findMany({
      where: {
        userId,
        status: { in: ['ACCEPTED', 'PENDING'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get contact user details
    const contactIds = contacts.map((c) => c.contactId);
    const users = await prisma.user.findMany({
      where: { id: { in: contactIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profilePhotoUrl: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const contactsWithDetails = contacts.map((contact) => ({
      ...contact,
      contactUser: usersMap.get(contact.contactId),
      isOnline: isUserOnline(contact.contactId),
    }));

    res.json(contactsWithDetails);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get pending contact requests (received)
router.get('/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Find contacts where I'm the contactId (received requests) and status is pending
    const requests = await prisma.contact.findMany({
      where: {
        contactId: userId,
        status: 'PENDING',
        initiatedBy: { not: userId }, // Not initiated by me
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get requester details
    const requesterIds = requests.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: requesterIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        profilePhotoUrl: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const requestsWithDetails = requests.map((request) => ({
      ...request,
      requester: usersMap.get(request.userId),
    }));

    res.json(requestsWithDetails);
  } catch (error) {
    console.error('Error fetching contact requests:', error);
    res.status(500).json({ error: 'Failed to fetch contact requests' });
  }
});

// Send a contact request
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: 'contactId required' });
    }

    if (contactId === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as contact' });
    }

    // Check if contact already exists
    const existing = await prisma.contact.findUnique({
      where: {
        userId_contactId: { userId, contactId },
      },
    });

    if (existing) {
      if (existing.status === 'BLOCKED') {
        return res.status(400).json({ error: 'Cannot send request to blocked user' });
      }
      return res.status(400).json({ error: 'Contact request already exists' });
    }

    // Check if the other user already sent us a request
    const reverseContact = await prisma.contact.findUnique({
      where: {
        userId_contactId: { userId: contactId, contactId: userId },
      },
    });

    if (reverseContact?.status === 'PENDING') {
      // Auto-accept: both users want to be contacts
      await prisma.$transaction([
        prisma.contact.update({
          where: { id: reverseContact.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        }),
        prisma.contact.create({
          data: {
            userId,
            contactId,
            status: 'ACCEPTED',
            initiatedBy: contactId, // They initiated
            acceptedAt: new Date(),
          },
        }),
      ]);

      // Notify the other user
      emitToUser(contactId, 'contact:accepted', { userId });

      return res.status(201).json({ status: 'ACCEPTED', message: 'Contact added' });
    }

    // Create contact request (both directions with PENDING)
    const [myContact] = await prisma.$transaction([
      prisma.contact.create({
        data: {
          userId,
          contactId,
          status: 'PENDING',
          initiatedBy: userId,
        },
      }),
      prisma.contact.create({
        data: {
          userId: contactId,
          contactId: userId,
          status: 'PENDING',
          initiatedBy: userId,
        },
      }),
    ]);

    // Notify the other user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    emitToUser(contactId, 'contact:request', { from: user, contactId: userId });

    res.status(201).json(myContact);
  } catch (error) {
    console.error('Error sending contact request:', error);
    res.status(500).json({ error: 'Failed to send contact request' });
  }
});

// Accept a contact request
router.post('/accept/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.params;

    // Update both contact records
    await prisma.$transaction([
      prisma.contact.updateMany({
        where: {
          OR: [
            { userId, contactId },
            { userId: contactId, contactId: userId },
          ],
          status: 'PENDING',
        },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
    ]);

    // Notify the requester
    emitToUser(contactId, 'contact:accepted', { userId });

    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting contact:', error);
    res.status(500).json({ error: 'Failed to accept contact' });
  }
});

// Decline/remove a contact
router.delete('/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.params;

    // Delete both contact records
    await prisma.contact.deleteMany({
      where: {
        OR: [
          { userId, contactId },
          { userId: contactId, contactId: userId },
        ],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing contact:', error);
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

// Block a user
router.post('/block/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.params;

    // Update or create blocked contact
    await prisma.contact.upsert({
      where: {
        userId_contactId: { userId, contactId },
      },
      update: {
        status: 'BLOCKED',
        blockedAt: new Date(),
      },
      create: {
        userId,
        contactId,
        status: 'BLOCKED',
        initiatedBy: userId,
        blockedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock a user
router.post('/unblock/:contactId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { contactId } = req.params;

    await prisma.contact.delete({
      where: {
        userId_contactId: { userId, contactId },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
