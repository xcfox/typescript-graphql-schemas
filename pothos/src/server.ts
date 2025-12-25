import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { schema } from './schema.ts'
import { initContextCache } from '@pothos/core'

const yoga = createYoga({
  schema,
  context: () => ({
    ...initContextCache(),
  }),
})

const server = createServer(yoga)

server.listen(4000, () => {
  console.log('Visit http://localhost:4000/graphql')
})
