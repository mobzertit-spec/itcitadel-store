import { handleOrder } from '../_shared/handler.ts'
import { productionDeps } from '../_shared/deps.ts'

const deps = productionDeps({ perVisitor: 10, perDay: 500 })
Deno.serve((req) => handleOrder(req, deps))
