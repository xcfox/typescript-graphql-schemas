import { app } from '@getcronit/pylon'
import { userQueries, userMutations } from './resolvers/user.ts'
import { menuQueries, menuMutations } from './resolvers/menu.ts'
import { orderQueries, orderMutations } from './resolvers/order.ts'
import { createLoaders } from './loaders.ts'

// Add loaders to context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

export const graphql = {
  Query: {
    ...userQueries,
    ...menuQueries,
    ...orderQueries,
  },
  Mutation: {
    ...userMutations,
    ...menuMutations,
    ...orderMutations,
  },
}

export default app
