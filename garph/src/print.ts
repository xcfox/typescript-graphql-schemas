import { printSchema, lexicographicSortSchema } from 'graphql'
import { writeFileSync } from 'node:fs'
import { schema } from './server.ts'

const sdl = printSchema(lexicographicSortSchema(schema))
writeFileSync(new URL('../schema.graphql', import.meta.url), sdl)
