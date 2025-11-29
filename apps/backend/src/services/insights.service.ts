/**
 * Insights Feed Aggregator Service
 * Fetches and parses RSS feeds from music industry sources
 */

import Parser from 'rss-parser';
import { prisma } from '../lib/prisma';
import { InsightCategory } from '../generated/client';

/**
 * Fetch Open Graph image from article URL
 * Fallback for sites that don't include images in RSS
 */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ProducerTour/1.0 (Music Industry Insights)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Look for og:image meta tag
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) return ogMatch[1];

    // Try alternate format
    const ogMatch2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch2 && ogMatch2[1]) return ogMatch2[1];

    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (twitterMatch && twitterMatch[1]) return twitterMatch[1];

    return null;
  } catch {
    return null;
  }
}

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'ProducerTour/1.0 (Music Industry Insights)',
  },
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
      ['media:group', 'media:group'],
      ['content:encoded', 'content:encoded'],
      ['enclosure', 'enclosure'],
      ['itunes:image', 'itunes:image'],
    ],
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
      // Try to extract image from RSS feed first
      let imageUrl = extractImageUrl(item);

      // If no image in RSS, try fetching og:image from article page
      if (!imageUrl && item.link) {
        console.log(`  🔍 Fetching og:image for "${item.title?.slice(0, 40)}..."...`);
        imageUrl = await fetchOgImage(item.link);
      }

      // Log extraction result
      if (imageUrl) {
        console.log(`  📷 Found image for "${item.title?.slice(0, 40)}...": ${imageUrl.slice(0, 60)}...`);
      } else {
        console.log(`  ⚠️ No image found for "${item.title?.slice(0, 40)}..."`);
      }

      // Try to insert, or update imageUrl if missing
      await prisma.insightArticle.upsert({
        where: { url: item.link },
        update: {
          // Update imageUrl if we found one and existing is null
          ...(imageUrl ? { imageUrl } : {}),
        },
        create: {
          url: item.link,
          title: item.title,
          description: item.contentSnippet || item.content?.slice(0, 500) || null,
          imageUrl,
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
 * RSS feeds use many different conventions for images
 */
function extractImageUrl(item: any): string | null {
  try {
    // 1. Check media:content (single object)
    if (item['media:content']?.['$']?.url) {
      return item['media:content']['$'].url;
    }

    // 2. Check media:content (array - take first image)
    if (Array.isArray(item['media:content'])) {
      const mediaItem = item['media:content'].find((m: any) =>
        m['$']?.medium === 'image' || m['$']?.type?.startsWith('image')
      ) || item['media:content'][0];
      if (mediaItem?.['$']?.url) return mediaItem['$'].url;
    }

    // 3. Check media:thumbnail
    if (item['media:thumbnail']?.['$']?.url) {
      return item['media:thumbnail']['$'].url;
    }
    if (Array.isArray(item['media:thumbnail']) && item['media:thumbnail'][0]?.['$']?.url) {
      return item['media:thumbnail'][0]['$'].url;
    }

    // 4. Check enclosure (common for podcasts/media)
    if (item.enclosure?.url) {
      if (!item.enclosure.type || item.enclosure.type.startsWith('image')) {
        return item.enclosure.url;
      }
    }

    // 5. Check itunes:image (podcasts)
    if (item['itunes:image']?.['$']?.href) {
      return item['itunes:image']['$'].href;
    }

    // 6. Check direct image property
    if (item.image?.url) return item.image.url;
    if (typeof item.image === 'string') return item.image;

    // 7. Check content:encoded for <img> tags
    const contentEncoded = item['content:encoded'] || item.content || item.description || '';
    if (contentEncoded) {
      // Try to find img src with various quote styles
      const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) return imgMatch[1];
    }

    // 8. Check for og:image in content (some feeds include meta)
    if (contentEncoded) {
      const ogMatch = contentEncoded.match(/og:image[^>]+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1]) return ogMatch[1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
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

/**
 * Debug function to see raw feed data
 */
export async function debugFeedItem() {
  // Test with Billboard feed
  const testUrl = 'https://www.billboard.com/feed/';

  try {
    const feed = await parser.parseURL(testUrl);
    const firstItem = feed.items[0];

    if (!firstItem) {
      return { error: 'No items in feed' };
    }

    // Get all keys from the item
    const allKeys = Object.keys(firstItem);

    return {
      feedTitle: feed.title,
      itemTitle: firstItem.title,
      itemLink: firstItem.link,
      allKeys,
      // Show specific fields we're looking for
      mediaContent: firstItem['media:content'],
      mediaThumbnail: firstItem['media:thumbnail'],
      mediaGroup: firstItem['media:group'],
      enclosure: firstItem.enclosure,
      contentEncoded: firstItem['content:encoded']?.slice(0, 500),
      content: firstItem.content?.slice(0, 500),
      description: firstItem.description?.slice(0, 500),
      image: firstItem.image,
      // Raw item for inspection
      rawItem: JSON.stringify(firstItem, null, 2).slice(0, 3000),
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
