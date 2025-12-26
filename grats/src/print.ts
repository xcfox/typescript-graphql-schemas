import { printSchema } from 'graphql'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSchema } from './schema.ts'
import { DateTimeResolver } from 'graphql-scalars'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const schema = getSchema({
  scalars: {
    DateTime: DateTimeResolver,
  },
})
const schemaString = printSchema(schema)

writeFileSync(join(__dirname, '../schema.graphql'), schemaString)
console.log('Schema printed to schema.graphql')
