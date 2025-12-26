import { g } from './g.ts'
import { buildSchema } from 'garph'
import { userQuery, userMutation, userResolvers } from './resolvers/user.ts'
import { menuQuery, menuMutation, menuResolvers } from './resolvers/menu.ts'
import { orderQuery, orderMutation, orderResolvers } from './resolvers/order.ts'

g.type('Query', {
  ...userQuery,
  ...menuQuery,
  ...orderQuery,
})

g.type('Mutation', {
  ...userMutation,
  ...menuMutation,
  ...orderMutation,
})

export const schema = buildSchema({
  g,
  resolvers: {
    ...userResolvers,
    ...menuResolvers,
    ...orderResolvers,
    Query: {
      ...userResolvers.Query,
      ...menuResolvers.Query,
      ...orderResolvers.Query,
    },
    Mutation: {
      ...userResolvers.Mutation,
      ...menuResolvers.Mutation,
      ...orderResolvers.Mutation,
    },
  },
})
