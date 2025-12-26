import { builder } from '../builder.ts'
import { USERS, incrementId } from '@coffee-shop/shared'
import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { Order, orderMap } from './order.ts'

export const User = builder.simpleObject('User', {
  fields: (t) => ({
    id: t.int(),
    name: t.string(),
    email: t.string(),
  }),
})

builder.objectFields(User, (t) => ({
  orders: t.loadableGroup({
    type: Order,
    load: async (userIds: number[]) => {
      return Array.from(orderMap.values()).filter((o) => userIds.includes(o.userId))
    },
    group: (order) => order.userId,
    resolve: (user) => user.id,
  }),
}))

// 使用 Pothos 推荐的 $inferType 来推导类型
export const userMap = new Map<number, typeof User.$inferType>(
  USERS.map((u) => [u.id, u as typeof User.$inferType]),
)

builder.queryFields((t) => ({
  users: t.field({
    type: [User],
    resolve: () => Array.from(userMap.values()),
  }),
  user: t.field({
    type: User,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  }),
}))

builder.mutationFields((t) => ({
  createUser: t.field({
    type: User,
    args: {
      name: t.arg.string({ required: true }),
      email: t.arg.string({
        required: true,
        validate: z.email(),
      }),
    },
    resolve: (_parent, { name, email }) => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    },
  }),
  updateUser: t.field({
    type: User,
    args: {
      id: t.arg.int({ required: true }),
      name: t.arg.string(),
      email: t.arg.string({
        validate: z.email(),
      }),
    },
    resolve: (_parent, { id, name, email }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name != null) user.name = name
      if (email != null) user.email = email
      return user
    },
  }),
  deleteUser: t.field({
    type: User,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const user = userMap.get(id)
      if (user) userMap.delete(id)
      return user || null
    },
  }),
}))
