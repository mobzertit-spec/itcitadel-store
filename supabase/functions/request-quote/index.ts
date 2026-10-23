import { handleQuote } from '../_shared/handler.ts'
import { productionDeps } from '../_shared/deps.ts'

const deps = productionDeps({ perVisitor: 5, perDay: 200 })
Deno.serve((req) => handleQuote(req, deps))
