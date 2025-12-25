import 'reflect-metadata'
import { schema } from './schema.ts'
import { runTests } from '@coffee-shop/shared/test'
import { createLoaders } from './context.ts'

runTests(schema, () => ({
  loaders: createLoaders(),
}))
