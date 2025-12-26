import { g, MenuItemType, menuItemMap, MenuCategoryEnum } from '../schema.ts'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import type { InferResolvers } from 'garph'

export const menuQueryFields = {
  menu: g.ref(MenuItemType).list(),
  menuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
  }),
}

const MenuQuery = g.type('MenuQuery', menuQueryFields)

export const menuQueryResolvers: InferResolvers<{ MenuQuery: typeof MenuQuery }, {}> = {
  MenuQuery: {
    menu: () => Array.from(menuItemMap.values()),
    menuItem: (_, { id }) => {
      const item = menuItemMap.get(id)
      return item || null
    },
  },
}

export const menuMutationFields = {
  createMenuItem: g.ref(MenuItemType).args({
    name: g.string(),
    price: g.float(),
    category: g.ref(MenuCategoryEnum),
  }),
  updateMenuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
    price: g.float().optional(),
  }),
  deleteMenuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
  }),
}

const MenuMutation = g.type('MenuMutation', menuMutationFields)

export const menuMutationResolvers: InferResolvers<{ MenuMutation: typeof MenuMutation }, {}> = {
  MenuMutation: {
    createMenuItem: (_, { name, price, category }) => {
      const id = incrementId()
      const newItem = { id, name, price, category }
      menuItemMap.set(id, newItem)
      return newItem
    },
    updateMenuItem: (_, { id, price }) => {
      const item = menuItemMap.get(id)
      if (!item) return null
      if (price !== undefined && price !== null) item.price = price
      return item
    },
    deleteMenuItem: (_, { id }) => {
      const item = menuItemMap.get(id)
      if (item) menuItemMap.delete(id)
      return item || null
    },
  },
}
