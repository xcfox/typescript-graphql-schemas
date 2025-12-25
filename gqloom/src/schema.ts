import * as z from 'zod'
import { GraphQLDateTime, GraphQLJSON, GraphQLJSONObject } from 'graphql-scalars'
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import { userResolver } from './resolvers/user.ts'
import { menuResolver } from './resolvers/menu.ts'
import { orderResolver } from './resolvers/order.ts'

export * from './type.ts'
export * from './resolvers/user.ts'
export * from './resolvers/menu.ts'
export * from './resolvers/order.ts'

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})

export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
