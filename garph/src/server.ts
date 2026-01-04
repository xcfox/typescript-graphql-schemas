import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { schema } from './schema.ts'

const yoga = createYoga({ schema })
const server = createServer(yoga)

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(4000, () => {
    console.info('Server is running on http://localhost:4000/graphql')
  })
}
