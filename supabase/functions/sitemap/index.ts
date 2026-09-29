import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Replace this with the actual domain in production
const SITE_URL = Deno.env.get('SITE_URL') || 'https://buduar.pp.ua'

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Fetch active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('slug, created_at')
      .eq('is_active', true)

    if (productsError) throw productsError

    // Start building XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/catalog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contacts</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`

    // Add products
    if (products) {
      for (const product of products) {
        xml += `  <url>
    <loc>${SITE_URL}/product/${product.slug}</loc>
    <lastmod>${new Date(product.created_at || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`
      }
    }

    xml += `</urlset>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error generating sitemap: ${err.message} -->
</urlset>`,
      {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        status: 500
      }
    )
  }
})
