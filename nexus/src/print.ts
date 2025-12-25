import { printSchema, lexicographicSortSchema } from 'graphql'
import { schema } from './schema.ts'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, '../schema.graphql')

const schemaString = printSchema(lexicographicSortSchema(schema))
await writeFile(schemaPath, schemaString)
console.log(`Schema printed to ${schemaPath}`)

