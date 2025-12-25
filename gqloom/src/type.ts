import * as z from 'zod'

export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),
})

export const Category = z.enum(['COFFEE', 'FOOD'])

export const MenuItem = z.object({
  __typename: z.literal('Menu').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
  category: Category,
})

export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])

export const Order = z.object({
  __typename: z.literal('Order').nullish(),
  id: z.int(),
  createdAt: z.date(),
  status: OrderStatus,
  userId: z.int(),
  itemIds: z.array(z.int()),
})
