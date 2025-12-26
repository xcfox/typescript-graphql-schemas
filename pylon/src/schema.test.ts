import { runTests } from '@coffee-shop/shared/test'
// @ts-ignore - .pylon/index.js is generated after build
import app from '../.pylon/index.js'

runTests(async (query, variables) => {
  const res = await app.request('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  const result = await res.json()
  if (result.errors) {
    // console.log('GraphQL Errors:', JSON.stringify(result.errors, null, 2))
  }
  return result
})
