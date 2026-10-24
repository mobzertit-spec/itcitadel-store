import { useEffect, useState } from 'react'
import { SUPABASE_KEY, SUPABASE_URL } from '@/config'
import snapshot from '@/data/catalog.json'

export type Variant = { id: string; label_ar: string; label_fr: string; label_en: string; price_dzd: number; sort: number }
export type Category = { id: string; name_ar: string; name_fr: string; name_en: string; sort: number }
export type Product = {
  id: string
  slug: string
  category_id: string
  name: string
  tagline_ar: string
  tagline_fr: string
  tagline_en: string
  description_ar: string
  description_fr: string
  description_en: string
  features_ar: string[]
  features_fr: string[]
  features_en: string[]
  requirements_ar: string
  requirements_fr: string
  requirements_en: string
  image_url: string | null
  per_user: boolean
  quote_only: boolean
  featured: boolean
  /** the one product at the top of the home page */
  hero: boolean
  sort: number
  product_variants: Variant[]
}
/** A real customer review, published by the owner from the dashboard. */
export type Review = { id: string; author: string; detail: string; body: string; product_id: string | null }
export type Catalog = { categories: Category[]; products: Product[]; reviews: Review[] }

/**
 * The catalog as it was at build time (scripts/snapshot.ts refreshes it before every build).
 * Pages render from it at once — prerendered HTML included — then switch to the live catalog.
 */
export const SNAPSHOT = snapshot as Catalog

const VARIANT_COLS = 'id,label_ar,label_fr,label_en,price_dzd,sort'
const PRODUCT_COLS =
  'id,slug,category_id,name,tagline_ar,tagline_fr,tagline_en,description_ar,description_fr,description_en,' +
  'features_ar,features_fr,features_en,requirements_ar,requirements_fr,requirements_en,image_url,per_user,quote_only,featured,hero,sort'

export const REVIEW_COLS = 'id,author,detail,body,product_id'

async function rest<T>(query: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { apikey: SUPABASE_KEY } })
  if (!res.ok) throw new Error(`catalog: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

/** The live catalog from the database (active products, plans and published reviews only — the database policies hide the rest). */
export async function fetchCatalog(): Promise<Catalog> {
  const [categories, products, reviews] = await Promise.all([
    rest<Category[]>('categories?select=id,name_ar,name_fr,name_en,sort&order=sort'),
    rest<Product[]>(`products?select=${PRODUCT_COLS},product_variants(${VARIANT_COLS})&order=sort&product_variants.order=sort`),
    rest<Review[]>(`reviews?select=${REVIEW_COLS}&order=sort,created_at.desc`),
  ])
  return { categories, products, reviews }
}

let live: Promise<Catalog | null> | undefined
const loadLive = () => (live ??= fetchCatalog().catch(() => null))

/** The catalog for rendering: the snapshot first, the live catalog as soon as it arrives. */
export function useCatalog(): { catalog: Catalog; settled: boolean } {
  const [state, setState] = useState<{ catalog: Catalog; settled: boolean }>({ catalog: SNAPSHOT, settled: false })
  useEffect(() => {
    let alive = true
    loadLive().then((c) => alive && setState({ catalog: c ?? SNAPSHOT, settled: true }))
    return () => {
      alive = false
    }
  }, [])
  return state
}

export const lowestPrice = (p: Product) => Math.min(...p.product_variants.map((v) => v.price_dzd))

/** The home page's top product (chosen in the dashboard), then the two featured ones shown beside it. */
export function heroProducts(catalog: Catalog): { hero?: Product; side: Product[] } {
  const hero = catalog.products.find((p) => p.hero) ?? catalog.products.find((p) => p.featured) ?? catalog.products[0]
  const others = catalog.products.filter((p) => p !== hero && !p.quote_only)
  return { hero, side: [...others.filter((p) => p.featured), ...others.filter((p) => !p.featured)].slice(0, 2) }
}
