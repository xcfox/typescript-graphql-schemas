import { schema } from './schema.ts'
import { runTests } from '@coffee-shop/shared/test'
import { initContextCache } from '@pothos/core'

runTests(schema, initContextCache)
