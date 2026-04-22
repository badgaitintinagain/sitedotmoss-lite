import { createClient } from '@libsql/client/web';

export async function onRequestGet(context) {
  try {
    // Access environment variables securely through context.env
    const client = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });

    // Query posts with computed stats
    const rs = await client.execute(`
      SELECT 
        p.*, 
        (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = p.id) as likesCount,
        (SELECT COUNT(*) FROM comments WHERE comments.post_slug = p.slug) as commentsCount
      FROM posts p
      WHERE p.published = 1 
      ORDER BY p.created_at DESC 
      LIMIT 10
    `);

    // Parse JSON fields (tags, images) and format to match frontend expectation
    const formattedPosts = rs.rows.map(row => {
      let tags = [];
      let images = [];
      try {
        tags = row.tags ? JSON.parse(row.tags as string) : [];
      } catch (e) {
        tags = typeof row.tags === 'string' ? row.tags.split(',') : [];
      }
      try {
        images = row.images ? JSON.parse(row.images as string) : [];
      } catch (e) {
        images = typeof row.images === 'string' ? row.images.split(',') : [];
      }
      return {
        ...row,
        tags,
        images,
      };
    });

    return new Response(JSON.stringify({ posts: formattedPosts, total: formattedPosts.length }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300' // Edge caching!
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
