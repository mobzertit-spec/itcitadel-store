/**
 * Build step 0: refresh src/data/catalog.json from the live database, so the prerendered pages (and Google)
 * show the prices and products the owner set in the dashboard. CI runs it before every build, including the
 * nightly one. If the database cannot be reached, the committed snapshot is kept and the build goes on.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const env = loadEnv('production', root, 'VITE_')
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

const VARIANTS = 'id,label_ar,label_fr,label_en,price_dzd,sort'
const PRODUCTS =
  'id,slug,category_id,name,tagline_ar,tagline_fr,tagline_en,description_ar,description_fr,description_en,' +
  'features_ar,features_fr,features_en,requirements_ar,requirements_fr,requirements_en,image_url,per_user,quote_only,featured,hero,sort'

async function get(query: string) {
  const res = await fetch(`${url}/rest/v1/${query}`, { headers: { apikey: key }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${query}`)
  return res.json()
}

try {
  const [categories, products, reviews] = await Promise.all([
    get('categories?select=id,name_ar,name_fr,name_en,sort&order=sort'),
    get(`products?select=${PRODUCTS},product_variants(${VARIANTS})&order=sort&product_variants.order=sort`),
    get('reviews?select=id,author,detail,body,product_id&order=sort,created_at.desc'),
  ])
  if (!Array.isArray(products) || products.length === 0) throw new Error('the live catalog is empty')
  writeFileSync(path.join(root, 'src/data/catalog.json'), JSON.stringify({ categories, products, reviews }, null, 1) + '\n')
  console.log(`catalog snapshot: ${products.length} products`)
} catch (err) {
  console.warn(`catalog snapshot kept as committed (${(err as Error).message})`)
}
