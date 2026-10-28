import { handlePush } from '../_shared/handler.ts'
import { pushDeps } from '../_shared/deps.ts'

const deps = pushDeps({ perVisitor: 30, perDay: 2000 })
Deno.serve((req) => handlePush(req, deps))
