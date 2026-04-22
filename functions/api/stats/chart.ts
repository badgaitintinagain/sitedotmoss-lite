import { createClient } from '@libsql/client/web';

export async function onRequestGet(context) {
  try {
    const client = createClient({
      url: context.env.TURSO_DATABASE_URL,
      authToken: context.env.TURSO_AUTH_TOKEN,
    });
    
    // Group posts count by month correctly
    const rs = await client.execute(`
      SELECT strftime('%Y-%m', created_at, 'unixepoch') as month, count(*) as count 
      FROM posts 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `);

    // Basic charting logic (Zero-JS SVG logic, as asked by user)
    const points = rs.rows.reverse().map(row => Number(row.count));

    // SVG generation directly for a bar chart
    const maxVal = Math.max(...points, 5);
    const width = 160;
    const height = 50;
    let bars = points.map((val, i) => {
      const barHeight = (val / maxVal) * height;
      const x = i * 26 + 10;
      const y = height - barHeight;
      return `<rect x="${x}" y="${y}" width="16" height="${barHeight}" fill="#3B82F6" rx="4" />`;
    }).join('');

    const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${bars}
    </svg>
    `;

    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'max-age=600' // cache 10 mins at edge
        }
    });
  } catch (error) {
    const fallbackSvg = `<svg width="100" height="50" xmlns="http://www.w3.org/2000/svg"><text x="0" y="20" fill="gray" font-size="10">No Data</text></svg>`;
    return new Response(fallbackSvg, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
}
