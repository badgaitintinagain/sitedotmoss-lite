import { createClient } from '@libsql/client/web';

export async function onRequestGet({ env }) {
  try {
    const client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
    
    // Aggregate global stats directly in SQl
    const res = await client.execute(`
      SELECT 
       (SELECT COUNT(*) FROM posts WHERE published = 1) AS total_posts,
       (SELECT COUNT(*) FROM post_likes) AS total_likes,
       (SELECT COUNT(*) FROM comments) AS total_comments
    `);

    const data = res.rows[0];

    return new Response(JSON.stringify({ 
      posts: data.total_posts || 0,
      likes: data.total_likes || 0,
      comments: data.total_comments || 0
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
