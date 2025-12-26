import { type Field, Gql, buildGraphQLSchema } from 'gqtx'
import { userQueryFields, userMutationFields } from './resolvers/user.ts'
import { menuQueryFields, menuMutationFields } from './resolvers/menu.ts'
import { orderQueryFields, orderMutationFields } from './resolvers/order.ts'

const Query = Gql.Query({
  fields: () =>
    [...userQueryFields, ...menuQueryFields, ...orderQueryFields] as [
      Field<any, any>,
      ...Field<any, any>[],
    ],
})

const Mutation = Gql.Mutation({
  fields: () =>
    [...userMutationFields, ...menuMutationFields, ...orderMutationFields] as [
      Field<any, any>,
      ...Field<any, any>[],
    ],
})

export const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
})
