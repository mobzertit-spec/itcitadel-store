import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fold, rankProducts } from './search.ts'

const p = (name: string, slug: string, category_id: string, extra = '') => ({
  name, slug, category_id, tagline_ar: '', tagline_fr: '', tagline_en: extra, description_ar: '', description_fr: '', description_en: '',
})
const products = [p('ChatGPT Plus', 'chatgpt-plus', 'ai'), p('Claude Pro', 'claude-pro', 'ai', 'An assistant by Anthropic'), p('Canva Pro', 'canva-pro', 'design'), p('Microsoft 365', 'microsoft-365', 'collab', 'Word, Excel, PowerPoint')]
const categories = [
  { id: 'ai', name_ar: 'الذكاء الاصطناعي', name_fr: 'Intelligence artificielle', name_en: 'AI' },
  { id: 'design', name_ar: 'التصميم والإبداع', name_fr: 'Design', name_en: 'Design' },
  { id: 'collab', name_ar: 'الإنتاجية والعمل', name_fr: 'Productivité', name_en: 'Productivity' },
]
const names = (q: string) => rankProducts(products, categories, q).map((x) => x.name)

describe('search', () => {
  it('puts names that start with the query first', () => {
    assert.deepEqual(names('c'), ['ChatGPT Plus', 'Claude Pro', 'Canva Pro', 'Microsoft 365'])
    // names first, then other text (Microsoft 365's category is "Productivity")
    assert.deepEqual(names('pro'), ['Claude Pro', 'Canva Pro', 'Microsoft 365'])
  })
  it('finds products by their texts and category names, in every language', () => {
    assert.deepEqual(names('anthropic'), ['Claude Pro'])
    assert.deepEqual(names('excel'), ['Microsoft 365'])
    assert.deepEqual(names('التصميم'), ['Canva Pro'])
  })
  it('understands the brands written in Arabic letters', () => {
    assert.deepEqual(names('كلود'), ['Claude Pro'])
    assert.deepEqual(names('كانفا'), ['Canva Pro'])
    assert.deepEqual(names('أوفيس'), ['Microsoft 365'])
  })
  it('folds Arabic spellings and finds nothing for nothing', () => {
    assert.equal(fold('الإنتاجيّة'), 'الانتاجيه')
    assert.deepEqual(names('   '), [])
    assert.deepEqual(names('netflix'), [])
  })
})
