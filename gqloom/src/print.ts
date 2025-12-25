import { printSchema } from 'graphql'
import { writeFileSync } from 'node:fs'
import { schema } from './schema.ts'

const sdl = printSchema(schema)
writeFileSync(new URL('../schema.graphql', import.meta.url), sdl)

