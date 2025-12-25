import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { resolver, query, mutation } from '@gqloom/core'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'

export const Category = z.enum(['COFFEE', 'FOOD'])

export const MenuItem = z.object({
  __typename: z.literal('Menu').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
  category: Category,
})

export const menuMap = new Map<number, z.infer<typeof MenuItem>>(MENU_ITEMS.map((i) => [i.id, i]))

export const menuResolver = resolver({
  menu: query(z.array(MenuItem)).resolve(() => Array.from(menuMap.values())),

  menuItem: query(MenuItem)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return item
    }),

  createMenuItem: mutation(MenuItem)
    .input({
      name: z.string(),
      price: z.number(),
      category: Category,
    })
    .resolve(({ name, price, category }) => {
      const id = incrementId()
      const newItem = { id, name, price, category }
      menuMap.set(id, newItem)
      return newItem
    }),

  updateMenuItem: mutation(MenuItem)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      price: z.number().nullish(),
      category: Category.nullish(),
    })
    .resolve(({ id, name, price, category }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (category != null) item.category = category
      return item
    }),

  deleteMenuItem: mutation(z.nullish(MenuItem))
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const item = menuMap.get(id)
      if (item) menuMap.delete(id)
      return item
    }),
})
