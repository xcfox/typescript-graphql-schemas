import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { UserResolver } from './resolvers/user.resolver.ts'
import { MenuResolver } from './resolvers/menu.resolver.ts'
import { OrderResolver } from './resolvers/order.resolver.ts'
import { GraphQLDateTime } from 'graphql-scalars'

export const schema = await buildSchema({
  resolvers: [UserResolver, MenuResolver, OrderResolver],
  scalarsMap: [{ type: Date, scalar: GraphQLDateTime }],
  validate: false, // We handle validation manually in resolvers
})
