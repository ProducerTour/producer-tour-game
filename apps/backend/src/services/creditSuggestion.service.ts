import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// In-memory cache to avoid repeated database queries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CreditSuggestionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  clearForUser(userId: string): void {
    // Clear all cache entries for a specific user
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`user:${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

const cache = new CreditSuggestionCache();

export interface CollaboratorSuggestion {
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  ipiNumber?: string;
  frequency: number; // How many times collaborated
  lastCollaborated: Date;
}

class CreditSuggestionService {
  /**
   * Search for collaborators by name across all of user's previous placement credits
   */
  async suggestCollaborators(userId: string, query: string): Promise<CollaboratorSuggestion[]> {
    const cacheKey = `user:${userId}:search:${query.toLowerCase()}`;
    const cached = cache.get<CollaboratorSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get all placements for the user
      const placements = await prisma.placement.findMany({
        where: { userId },
        include: {
          credits: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Extract unique collaborators
      const collaboratorMap = new Map<string, CollaboratorSuggestion>();

      for (const placement of placements) {
        for (const credit of placement.credits) {
          const fullName = `${credit.firstName} ${credit.lastName}`.toLowerCase();
          const key = `${fullName}:${credit.role}`;

          // Filter by query
          if (query && !fullName.includes(query.toLowerCase())) {
            continue;
          }

          if (collaboratorMap.has(key)) {
            const existing = collaboratorMap.get(key)!;
            existing.frequency += 1;
            if (placement.createdAt > existing.lastCollaborated) {
              existing.lastCollaborated = placement.createdAt;
            }
          } else {
            collaboratorMap.set(key, {
              firstName: credit.firstName,
              lastName: credit.lastName,
              fullName: `${credit.firstName} ${credit.lastName}`,
              role: credit.role,
              ipiNumber: credit.ipiNumber || undefined,
              frequency: 1,
              lastCollaborated: placement.createdAt,
            });
          }
        }
      }

      // Convert map to array and sort by frequency (most frequent first)
      const suggestions = Array.from(collaboratorMap.values()).sort((a, b) => {
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return b.lastCollaborated.getTime() - a.lastCollaborated.getTime();
      });

      cache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Error suggesting collaborators:', error);
      throw error;
    }
  }

  /**
   * Get user's most frequent collaborators (top 10)
   */
  async getFrequentCollaborators(userId: string, limit: number = 10): Promise<CollaboratorSuggestion[]> {
    const cacheKey = `user:${userId}:frequent:${limit}`;
    const cached = cache.get<CollaboratorSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const all = await this.suggestCollaborators(userId, '');
      const frequent = all.slice(0, limit);

      cache.set(cacheKey, frequent);
      return frequent;
    } catch (error) {
      console.error('Error getting frequent collaborators:', error);
      throw error;
    }
  }

  /**
   * Get user's recent collaborators (from last N placements)
   */
  async getRecentCollaborators(userId: string, limit: number = 10): Promise<CollaboratorSuggestion[]> {
    const cacheKey = `user:${userId}:recent:${limit}`;
    const cached = cache.get<CollaboratorSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get recent placements
      const placements = await prisma.placement.findMany({
        where: { userId },
        include: {
          credits: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20, // Look at last 20 placements
      });

      // Extract unique recent collaborators
      const collaboratorMap = new Map<string, CollaboratorSuggestion>();

      for (const placement of placements) {
        for (const credit of placement.credits) {
          const fullName = `${credit.firstName} ${credit.lastName}`.toLowerCase();
          const key = `${fullName}:${credit.role}`;

          if (!collaboratorMap.has(key)) {
            collaboratorMap.set(key, {
              firstName: credit.firstName,
              lastName: credit.lastName,
              fullName: `${credit.firstName} ${credit.lastName}`,
              role: credit.role,
              ipiNumber: credit.ipiNumber || undefined,
              frequency: 1,
              lastCollaborated: placement.createdAt,
            });
          }

          if (collaboratorMap.size >= limit) break;
        }
        if (collaboratorMap.size >= limit) break;
      }

      const recent = Array.from(collaboratorMap.values()).sort(
        (a, b) => b.lastCollaborated.getTime() - a.lastCollaborated.getTime()
      );

      cache.set(cacheKey, recent);
      return recent;
    } catch (error) {
      console.error('Error getting recent collaborators:', error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or when credits are updated)
   */
  clearCache(userId?: string): void {
    if (userId) {
      cache.clearForUser(userId);
    } else {
      cache.clear();
    }
  }
}

export default new CreditSuggestionService();
