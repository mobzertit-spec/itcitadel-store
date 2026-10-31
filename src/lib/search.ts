/**
 * The store's search: product names first, then any text in the three languages. Arabic spellings of the brands
 * ("كلود", "كانفا"…) find them too. No imports: tested with tsx.
 */
export type Searchable = {
  name: string
  slug: string
  category_id: string
  tagline_ar: string
  tagline_fr: string
  tagline_en: string
  description_ar: string
  description_fr: string
  description_en: string
}
export type SearchCategory = { id: string; name_ar: string; name_fr: string; name_en: string }

// how people write the brands in Arabic letters → the Latin name they mean
const ALIASES: [RegExp, string][] = [
  [/كلود|كلاود/, 'claude'],
  [/شات|تشات|جي بي تي|جيبيتي|اوبن/, 'chatgpt'],
  [/جيمي?ني|جمناي|جيميناي/, 'gemini'],
  [/كانفا|كنفا/, 'canva'],
  [/ادوبي|أدوبي|فوتوشوب|اليستريتور|إليستريتور/, 'adobe'],
  [/مايكروسوفت|ميكروسوفت|اوفيس|أوفيس|وورد|اكسل|إكسل/, 'microsoft'],
  [/زوم/, 'zoom'],
  [/كاسبر|كسبر/, 'kaspersky'],
  [/ماغنيفيك|ماجنيفيك|فريبيك|فري بيك/, 'magnific'],
  [/جوجل|غوغل|قوقل|ورك سبيس|ووركسبيس/, 'google'],
]

/** Lower case, Arabic letters folded (أ إ آ → ا, ة → ه, ى → ي, no short vowels), spaces squeezed. */
export function fold(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The products matching `q`, best first: names that start with it, then names that contain it, then other text. */
export function rankProducts<P extends Searchable>(products: P[], categories: SearchCategory[], q: string): P[] {
  const query = fold(q)
  if (!query) return []
  const alias = ALIASES.find(([re]) => re.test(query))?.[1]
  const scored = products.map((p, i) => {
    const name = fold(`${p.name} ${p.slug}`)
    const c = categories.find((x) => x.id === p.category_id)
    const text = fold([p.tagline_ar, p.tagline_fr, p.tagline_en, p.description_ar, p.description_fr, p.description_en, c?.name_ar, c?.name_fr, c?.name_en].join(' '))
    const score =
      name.startsWith(query) || (alias && name.startsWith(alias)) ? 3 : name.includes(query) || (alias && name.includes(alias)) ? 2 : text.includes(query) ? 1 : 0
    return { p, i, score }
  })
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p)
}
