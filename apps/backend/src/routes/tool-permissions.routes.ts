import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Default tool permissions (used for seeding if none exist)
const DEFAULT_TOOL_PERMISSIONS = [
  { toolId: 'pub-deal-simulator', toolName: 'Pub Deal Simulator', roles: ['ADMIN'] },
  { toolId: 'consultation-form', toolName: 'Consultation Form', roles: ['ADMIN'] },
  { toolId: 'case-study', toolName: 'Case Study', roles: ['ADMIN'] },
  { toolId: 'royalty-tracker', toolName: 'Royalty Portal', roles: ['ADMIN'] },
  { toolId: 'opportunities', toolName: 'Opportunities', roles: ['ADMIN'] },
  { toolId: 'advance-estimator', toolName: 'Advance Estimator', roles: ['ADMIN'] },
  { toolId: 'placement-tracker', toolName: 'Placement Tracker', roles: ['ADMIN'] },
  { toolId: 'work-registration', toolName: 'Work Registration Tool', roles: ['ADMIN', 'WRITER', 'MANAGER', 'LEGAL'] },
  { toolId: 'metadata-index', toolName: 'Metadata Index', roles: ['ADMIN'] },
  { toolId: 'session-payout', toolName: 'Session Payout & Delivery', roles: ['ADMIN'] },
  { toolId: 'type-beat-video-maker', toolName: 'Type Beat Video Maker', roles: ['ADMIN', 'WRITER', 'CUSTOMER'] },
];

/**
 * GET /api/tool-permissions
 * Get all tool permissions (for admin settings page)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    let permissions = await prisma.toolPermission.findMany({
      where: { isActive: true },
      orderBy: { toolName: 'asc' },
    });

    // If no permissions exist, seed with defaults
    if (permissions.length === 0) {
      await prisma.toolPermission.createMany({
        data: DEFAULT_TOOL_PERMISSIONS.map(p => ({
          toolId: p.toolId,
          toolName: p.toolName,
          roles: p.roles,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      permissions = await prisma.toolPermission.findMany({
        where: { isActive: true },
        orderBy: { toolName: 'asc' },
      });
    }

    res.json({ permissions });
  } catch (error: any) {
    console.error('Get tool permissions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tool permissions' });
  }
});

/**
 * GET /api/tool-permissions/user
 * Get tool permissions for the current user (filtered by their role)
 */
router.get('/user', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const userRole = user.role;

    let permissions = await prisma.toolPermission.findMany({
      where: { isActive: true },
    });

    // If no permissions exist, seed with defaults
    if (permissions.length === 0) {
      await prisma.toolPermission.createMany({
        data: DEFAULT_TOOL_PERMISSIONS.map(p => ({
          toolId: p.toolId,
          toolName: p.toolName,
          roles: p.roles,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      permissions = await prisma.toolPermission.findMany({
        where: { isActive: true },
      });
    }

    // Filter to tools the user has access to
    const accessibleTools = permissions.filter(p => {
      const roles = p.roles as string[];
      return roles.includes(userRole);
    });

    // Return just the tool IDs that user can access
    res.json({
      toolIds: accessibleTools.map(p => p.toolId),
      permissions: accessibleTools,
    });
  } catch (error: any) {
    console.error('Get user tool permissions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get tool permissions' });
  }
});

/**
 * PUT /api/tool-permissions
 * Update all tool permissions (admin only)
 */
router.put('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions array is required' });
    }

    // Update each permission
    const updates = await Promise.all(
      permissions.map(async (perm: { toolId: string; toolName: string; roles: string[] }) => {
        return prisma.toolPermission.upsert({
          where: { toolId: perm.toolId },
          create: {
            toolId: perm.toolId,
            toolName: perm.toolName,
            roles: perm.roles,
            isActive: true,
          },
          update: {
            toolName: perm.toolName,
            roles: perm.roles,
          },
        });
      })
    );

    res.json({
      success: true,
      message: 'Tool permissions updated successfully',
      permissions: updates,
    });
  } catch (error: any) {
    console.error('Update tool permissions error:', error);
    res.status(500).json({ error: error.message || 'Failed to update tool permissions' });
  }
});

/**
 * PATCH /api/tool-permissions/:toolId
 * Update a single tool's permissions (admin only)
 */
router.patch('/:toolId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { toolId } = req.params;
    const { roles, toolName } = req.body;

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles array is required' });
    }

    const permission = await prisma.toolPermission.upsert({
      where: { toolId },
      create: {
        toolId,
        toolName: toolName || toolId,
        roles,
        isActive: true,
      },
      update: {
        roles,
        ...(toolName && { toolName }),
      },
    });

    res.json({ success: true, permission });
  } catch (error: any) {
    console.error('Update tool permission error:', error);
    res.status(500).json({ error: error.message || 'Failed to update tool permission' });
  }
});

export default router;
