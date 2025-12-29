import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

type UserRole = 'ADMIN' | 'WRITER' | 'LEGAL' | 'MANAGER';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isImpersonating?: boolean;
    adminId?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check Authorization header first (standard API calls)
    let token = req.headers.authorization?.replace('Bearer ', '');

    // Fall back to query parameter for file downloads (window.open() can't send headers)
    if (!token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: UserRole;
      isImpersonating?: boolean;
      adminId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Handle impersonation tokens
    if (decoded.isImpersonating && decoded.adminId) {
      req.user = {
        ...user,
        isImpersonating: true,
        adminId: decoded.adminId,
      };
    } else {
      req.user = user;
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // If impersonating, check if the impersonated user has the role
    // (Admin operations should still work when impersonating)
    if (!roles.includes(req.user.role)) {
      // If user is impersonating, allow admin-level operations
      if (req.user.isImpersonating && roles.includes('ADMIN')) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireWriter = requireRole('WRITER', 'ADMIN');
export const requireLegal = requireRole('LEGAL', 'ADMIN');
