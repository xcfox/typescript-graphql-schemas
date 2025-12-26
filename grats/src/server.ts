import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { getSchema } from './schema.ts'
import { DateTimeResolver } from 'graphql-scalars'
import './print.ts'

const yoga = createYoga({
  schema: getSchema({
    scalars: {
      DateTime: DateTimeResolver,
    },
  }),
})

const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
