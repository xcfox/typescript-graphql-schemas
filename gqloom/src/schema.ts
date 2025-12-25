import { resolver, query, mutation, weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import { z } from 'zod'
import { USERS, MENU_ITEMS, ORDERS } from '@coffee-shop/shared'

// 1. 定义模型 (Using Zod)
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
})

const CategorySchema = z.enum(['COFFEE', 'FOOD'])

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: CategorySchema,
})

const OrderStatusSchema = z.enum(['PENDING', 'COMPLETED'])

const OrderSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  status: OrderStatusSchema,
  userId: z.string(),
  itemIds: z.array(z.string()),
})

// 2. 定义解析器
const coffeeResolver = resolver({
  // 查询：获取菜单
  menu: query(z.array(MenuItemSchema)).resolve(() => MENU_ITEMS),

  // 查询：获取单个用户及其订单 (演示关联)
  user: query(UserSchema)
    .input({ id: z.string() })
    .resolve(({ id }) => {
      const user = USERS.find((u) => u.id === id)
      if (!user) throw new Error('User not found')
      return user
    }),

  // Mutation: 下单 (演示验证)
  createOrder: mutation(OrderSchema)
    .input({
      userId: z.string(),
      items: z.array(z.string()).min(1, 'At least one item is required'),
    })
    .resolve(({ userId, items }) => {
      const newOrder = {
        id: `o${ORDERS.length + 1}`,
        userId,
        itemIds: items,
        status: 'PENDING' as const,
        createdAt: new Date(),
      }
      ORDERS.push(newOrder)
      return newOrder
    }),
})

// 3. 编织 Schema
export const schema = weave(ZodWeaver, coffeeResolver)

