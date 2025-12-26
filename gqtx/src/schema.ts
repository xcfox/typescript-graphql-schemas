import { type Field, Gql, buildGraphQLSchema } from 'gqtx'
import { userQueryFields, userMutationFields } from './resolvers/user.ts'
import { menuQueryFields, menuMutationFields } from './resolvers/menu.ts'
import { orderQueryFields, orderMutationFields } from './resolvers/order.ts'

// 类型辅助：合并字段数组，保留类型信息
type FieldArray = readonly Field<unknown, unknown>[]

const Query = Gql.Query({
  fields: () =>
    ([...userQueryFields, ...menuQueryFields, ...orderQueryFields] as FieldArray) as [
      Field<unknown, unknown>,
      ...Field<unknown, unknown>[],
    ],
})

const Mutation = Gql.Mutation({
  fields: () =>
    ([...userMutationFields, ...menuMutationFields, ...orderMutationFields] as FieldArray) as [
      Field<unknown, unknown>,
      ...Field<unknown, unknown>[],
    ],
})

export const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
})
