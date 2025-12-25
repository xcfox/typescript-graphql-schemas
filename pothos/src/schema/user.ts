import { builder, type InferPothosObject } from '../builder.ts'
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
  orders: t.field({
    type: [Order],
    resolve: (user) => {
      return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
    },
  }),
}))

// 从 UserRef 的泛型参数中提取 Shape，不再手写 interface
export const userMap = new Map<number, InferPothosObject<typeof User>>(
  USERS.map((u) => [u.id, u as InferPothosObject<typeof User>]),
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
        validate: z.string().email(),
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
        validate: z.string().email(),
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
