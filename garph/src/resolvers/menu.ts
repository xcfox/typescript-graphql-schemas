import { g } from '../g.ts'
import { GraphQLError } from 'graphql'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import type { Infer } from 'garph'

export const Category = g.enumType('Category', ['COFFEE', 'FOOD'] as const)

export const MenuItem = g.type('MenuItem', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
  category: g.ref(() => Category),
})

export type MenuItemType = Infer<typeof MenuItem>

export const menuMap = new Map<number, MenuItemType>(
  MENU_ITEMS.map((i) => [i.id, i as MenuItemType])
)

export const menuQuery = {
  menu: g
    .ref(() => MenuItem)
    .list()
    .description('Get all menu items'),
  menuItem: g
    .ref(() => MenuItem)
    .args({
      id: g.int(),
    })
    .description('Get a menu item by ID'),
}

export const menuMutation = {
  createMenuItem: g
    .ref(() => MenuItem)
    .args({
      name: g.string(),
      price: g.float(),
      category: g.ref(() => Category),
    })
    .description('Create a new menu item'),
  updateMenuItem: g
    .ref(() => MenuItem)
    .args({
      id: g.int(),
      name: g.string().optional(),
      price: g.float().optional(),
      category: g.ref(() => Category).optional(),
    })
    .description('Update a menu item'),
  deleteMenuItem: g
    .ref(() => MenuItem)
    .optional()
    .args({
      id: g.int(),
    })
    .description('Delete a menu item'),
}

export const menuResolvers = {
  Query: {
    menu: () => Array.from(menuMap.values()),
    menuItem: (_: any, { id }: { id: number }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return item
    },
  },
  Mutation: {
    createMenuItem: (_: any, { name, price, category }: any) => {
      const id = incrementId()
      const newItem = { id, name, price, category }
      menuMap.set(id, newItem)
      return newItem
    },
    updateMenuItem: (_: any, { id, name, price, category }: any) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      if (name !== undefined) item.name = name
      if (price !== undefined) item.price = price
      if (category !== undefined) item.category = category
      return item
    },
    deleteMenuItem: (_: any, { id }: { id: number }) => {
      const item = menuMap.get(id)
      if (item) menuMap.delete(id)
      return item
    },
  },
}

