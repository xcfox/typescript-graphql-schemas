import { runTests } from '@coffee-shop/shared/test'
import { getSchema } from './schema.ts'
import { DateTimeResolver } from 'graphql-scalars'

const schema = getSchema({
  scalars: {
    DateTime: DateTimeResolver,
  },
})

runTests(schema)
