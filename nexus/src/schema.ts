import { makeSchema, scalarType, queryType, mutationType } from 'nexus'
import { DateTimeResolver } from 'graphql-scalars'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Import all schema modules
import './schema/user.ts'
import './schema/menu.ts'
import './schema/order.ts'

// Import query and mutation extensions
import { UserQuery, UserMutation } from './schema/user.ts'
import {
  MenuQuery,
  MenuMutation,
  Food,
  Coffee,
  Dessert,
  MenuItem,
  SugarLevel,
} from './schema/menu.ts'
import { OrderQuery, OrderMutation } from './schema/order.ts'

// DateTime scalar
const DateTime = scalarType({
  name: 'DateTime',
  asNexusMethod: 'dateTime',
  description: 'DateTime scalar type',
  parseValue(value: unknown) {
    return DateTimeResolver.parseValue(value)
  },
  serialize(value: unknown) {
    return DateTimeResolver.serialize(value)
  },
  parseLiteral(ast) {
    return DateTimeResolver.parseLiteral(ast, {})
  },
})

// Define Query and Mutation root types
const Query = queryType({
  definition() {
    // Fields are added via extendType in schema modules
  },
})

const Mutation = mutationType({
  definition() {
    // Fields are added via extendType in schema modules
  },
})

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const schema = makeSchema({
  types: [
    DateTime,
    Query,
    Mutation,
    UserQuery,
    UserMutation,
    Food,
    Coffee,
    Dessert,
    MenuItem,
    SugarLevel,
    MenuQuery,
    MenuMutation,
    OrderQuery,
    OrderMutation,
  ],
  outputs: {
    schema: join(__dirname, '../schema.graphql'),
    typegen: join(__dirname, './nexus-typegen.d.ts'),
  },
  contextType: {
    module: join(__dirname, './context.ts'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@coffee-shop/shared',
        alias: 'shared',
      },
    ],
  },
})
