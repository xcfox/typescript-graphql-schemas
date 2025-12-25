import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { validate } from 'class-validator'
import { GraphQLError } from 'graphql'
import { UserResolver } from './resolvers/user.resolver.ts'
import { MenuResolver } from './resolvers/menu.resolver.ts'
import { OrderResolver } from './resolvers/order.resolver.ts'
import { GraphQLDateTime } from 'graphql-scalars'

export const schema = await buildSchema({
  resolvers: [UserResolver, MenuResolver, OrderResolver],
  scalarsMap: [{ type: Date, scalar: GraphQLDateTime }],
  validateFn: async (argValue) => {
    if (typeof argValue !== 'object' || argValue === null) {
      return
    }
    const errors = await validate(argValue)
    if (errors.length > 0) {
      const message = Object.values(errors[0].constraints || {})[0]
      throw new GraphQLError(message)
    }
  },
})
