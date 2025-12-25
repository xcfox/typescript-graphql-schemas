import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { printSchema } from 'graphql'
import { schema } from './schema.js'

const sdl = printSchema(schema)
writeFileSync(new URL('../schema.graphql', import.meta.url), sdl)

const yoga = createYoga({ schema })

const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
