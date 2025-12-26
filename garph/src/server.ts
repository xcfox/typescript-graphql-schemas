import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { buildSchema } from 'garph'
import { g } from './schema.ts'
import {
  userQueryFields,
  userMutationFields,
  userResolvers,
  userQueryResolvers,
  userMutationResolvers,
} from './resolvers/user.ts'
import {
  menuQueryFields,
  menuMutationFields,
  menuQueryResolvers,
  menuMutationResolvers,
} from './resolvers/menu.ts'
import {
  orderQueryFields,
  orderMutationFields,
  orderResolvers,
  orderQueryResolvers,
  orderMutationResolvers,
} from './resolvers/order.ts'

const Query = g.type('Query', {
  ...userQueryFields,
  ...menuQueryFields,
  ...orderQueryFields,
})

const Mutation = g.type('Mutation', {
  ...userMutationFields,
  ...menuMutationFields,
  ...orderMutationFields,
})

const resolvers = {
  Query: {
    ...userQueryResolvers.UserQuery,
    ...menuQueryResolvers.MenuQuery,
    ...orderQueryResolvers.OrderQuery,
  },
  Mutation: {
    ...userMutationResolvers.UserMutation,
    ...menuMutationResolvers.MenuMutation,
    ...orderMutationResolvers.OrderMutation,
  },
  User: userResolvers.User,
  Order: orderResolvers.Order,
}

export const schema = buildSchema({ g, resolvers })

const yoga = createYoga({ schema })
const server = createServer(yoga)

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(4000, () => {
    console.info('Server is running on http://localhost:4000/graphql')
  })
}
