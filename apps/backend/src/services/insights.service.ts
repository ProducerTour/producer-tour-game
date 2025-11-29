/**
 * Insights Feed Aggregator Service
 * Fetches and parses RSS feeds from music industry sources
 */

import Parser from 'rss-parser';
import { prisma } from '../lib/prisma';
import { InsightCategory } from '../generated/client';

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'ProducerTour/1.0 (Music Industry Insights)',
  },
});

// Default feed sources to seed the database
export const DEFAULT_FEED_SOURCES = [
  // Critical Tastemakers
  {
    name: 'Pitchfork',
    feedUrl: 'https://pitchfork.com/feed/feed-news/rss',
    category: 'TASTEMAKERS' as InsightCategory,
  },
  {
    name: 'The FADER',
    feedUrl: 'https://www.thefader.com/rss.xml',
    category: 'TASTEMAKERS' as InsightCategory,
  },
  // Industry News
  {
    name: 'Billboard',
    feedUrl: 'https://www.billboard.com/feed/',
    category: 'NEWS' as InsightCategory,
  },
  {
    name: 'Rolling Stone Music',
    feedUrl: 'https://www.rollingstone.com/music/feed/',
    category: 'NEWS' as InsightCategory,
  },
  {
    name: 'Music Business Worldwide',
    feedUrl: 'https://www.musicbusinessworldwide.com/feed/',
    category: 'NEWS' as InsightCategory,
  },
  // Discovery
  {
    name: 'HotNewHipHop',
    feedUrl: 'https://www.hotnewhiphop.com/rss/news.xml',
    category: 'DISCOVERY' as InsightCategory,
  },
  {
    name: 'XXL',
    feedUrl: 'https://www.xxlmag.com/feed/',
    category: 'DISCOVERY' as InsightCategory,
  },
];

/**
 * Seed default feed sources if they don't exist
 */
export async function seedFeedSources(): Promise<void> {
  console.log('🌱 Seeding insight feed sources...');

  for (const source of DEFAULT_FEED_SOURCES) {
    await prisma.insightFeedSource.upsert({
      where: { name: source.name },
      update: {},
      create: source,
    });
  }

  console.log(`✅ Seeded ${DEFAULT_FEED_SOURCES.length} feed sources`);
}

/**
 * Fetch and parse a single RSS feed
 */
async function fetchFeed(feedUrl: string): Promise<Parser.Output<any> | null> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return feed;
  } catch (error: any) {
    console.error(`Failed to fetch feed ${feedUrl}:`, error.message);
    return null;
  }
}

/**
 * Process a single feed source and save new articles
 */
export async function processFeedSource(sourceId: string): Promise<number> {
  const source = await prisma.insightFeedSource.findUnique({
    where: { id: sourceId },
  });

  if (!source || !source.isActive) {
    return 0;
  }

  console.log(`📡 Fetching feed: ${source.name}`);

  const feed = await fetchFeed(source.feedUrl);

  if (!feed) {
    await prisma.insightFeedSource.update({
      where: { id: sourceId },
      data: {
        lastError: 'Failed to fetch feed',
        lastFetchedAt: new Date(),
      },
    });
    return 0;
  }

  let newArticles = 0;

  for (const item of feed.items.slice(0, 20)) { // Limit to 20 most recent
    if (!item.link || !item.title) continue;

    try {
      // Try to insert, skip if URL already exists
      await prisma.insightArticle.upsert({
        where: { url: item.link },
        update: {}, // Don't update existing articles
        create: {
          url: item.link,
          title: item.title,
          description: item.contentSnippet || item.content?.slice(0, 500) || null,
          imageUrl: extractImageUrl(item),
          source: source.name,
          category: source.category,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
          fetchedAt: new Date(),
        },
      });
      newArticles++;
    } catch (error: any) {
      // Silently skip duplicates (unique constraint violations)
      if (!error.message?.includes('Unique constraint')) {
        console.error(`Error saving article: ${error.message}`);
      }
    }
  }

  // Update source stats
  const totalArticles = await prisma.insightArticle.count({
    where: { source: source.name },
  });

  await prisma.insightFeedSource.update({
    where: { id: sourceId },
    data: {
      lastFetchedAt: new Date(),
      lastError: null,
      articleCount: totalArticles,
    },
  });

  console.log(`✅ ${source.name}: ${newArticles} new articles (${totalArticles} total)`);
  return newArticles;
}

/**
 * Extract image URL from feed item (various formats)
 */
function extractImageUrl(item: any): string | null {
  // Check media:content
  if (item['media:content']?.['$']?.url) {
    return item['media:content']['$'].url;
  }
  // Check enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  // Check for image in content
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) return imgMatch[1];
  }
  return null;
}

/**
 * Refresh all active feed sources
 */
export async function refreshAllFeeds(): Promise<{ total: number; newArticles: number }> {
  console.log('\n🔄 Starting feed refresh...');

  const sources = await prisma.insightFeedSource.findMany({
    where: { isActive: true },
  });

  let totalNew = 0;

  for (const source of sources) {
    try {
      const newCount = await processFeedSource(source.id);
      totalNew += newCount;
      // Small delay between feeds to be nice to servers
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`Error processing ${source.name}:`, error.message);
    }
  }

  console.log(`\n✅ Feed refresh complete: ${totalNew} new articles from ${sources.length} sources\n`);

  return { total: sources.length, newArticles: totalNew };
}

/**
 * Get articles with filtering and pagination
 */
export async function getArticles(options: {
  category?: InsightCategory;
  source?: string;
  limit?: number;
  offset?: number;
  includePinned?: boolean;
}) {
  const { category, source, limit = 50, offset = 0, includePinned = true } = options;

  const where: any = {
    isHidden: false,
  };

  if (category) {
    where.category = category;
  }

  if (source) {
    where.source = source;
  }

  // Get pinned articles first (if requested)
  let pinnedArticles: any[] = [];
  if (includePinned && offset === 0) {
    pinnedArticles = await prisma.insightArticle.findMany({
      where: { ...where, isPinned: true },
      orderBy: { pinnedAt: 'desc' },
    });
  }

  // Get regular articles
  const articles = await prisma.insightArticle.findMany({
    where: { ...where, isPinned: false },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.insightArticle.count({ where });

  return {
    articles: [...pinnedArticles, ...articles],
    total,
    pinnedCount: pinnedArticles.length,
  };
}

/**
 * Pin/unpin an article
 */
export async function togglePinArticle(articleId: string, adminId: string): Promise<boolean> {
  const article = await prisma.insightArticle.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error('Article not found');
  }

  const updated = await prisma.insightArticle.update({
    where: { id: articleId },
    data: {
      isPinned: !article.isPinned,
      pinnedBy: !article.isPinned ? adminId : null,
      pinnedAt: !article.isPinned ? new Date() : null,
    },
  });

  return updated.isPinned;
}

/**
 * Hide/unhide an article
 */
export async function toggleHideArticle(articleId: string): Promise<boolean> {
  const article = await prisma.insightArticle.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error('Article not found');
  }

  const updated = await prisma.insightArticle.update({
    where: { id: articleId },
    data: { isHidden: !article.isHidden },
  });

  return updated.isHidden;
}

/**
 * Manually add an article (admin curation)
 */
export async function addManualArticle(
  data: {
    url: string;
    title: string;
    description?: string;
    imageUrl?: string;
    source: string;
    category: InsightCategory;
  },
  adminId: string
) {
  return prisma.insightArticle.create({
    data: {
      ...data,
      isManual: true,
      addedBy: adminId,
      fetchedAt: new Date(),
    },
  });
}

/**
 * Get feed sources with stats
 */
export async function getFeedSources() {
  return prisma.insightFeedSource.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Toggle feed source active status
 */
export async function toggleFeedSource(sourceId: string): Promise<boolean> {
  const source = await prisma.insightFeedSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error('Feed source not found');
  }

  const updated = await prisma.insightFeedSource.update({
    where: { id: sourceId },
    data: { isActive: !source.isActive },
  });

  return updated.isActive;
}
