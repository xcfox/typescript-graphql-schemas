import { g, MenuItemType, CoffeeType, DessertType, menuItemMap, SugarLevelEnum } from '../schema.ts'
import { incrementId } from '@coffee-shop/shared'
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
  createCoffee: g.ref(CoffeeType).args({
    name: g.string(),
    price: g.float(),
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  }),
  updateCoffee: g
    .ref(CoffeeType)
    .optional()
    .args({
      id: g.int(),
      name: g.string().optional(),
      price: g.float().optional(),
      sugarLevel: g.ref(SugarLevelEnum).optional(),
      origin: g.string().optional(),
    }),
  createDessert: g.ref(DessertType).args({
    name: g.string(),
    price: g.float(),
    calories: g.float(),
  }),
  updateDessert: g.ref(DessertType).optional().args({
    id: g.int(),
    name: g.string().optional(),
    price: g.float().optional(),
    calories: g.float().optional(),
  }),
  deleteMenuItem: g.ref(MenuItemType).optional().args({
    id: g.int(),
  }),
}

const MenuMutation = g.type('MenuMutation', menuMutationFields)

export const menuMutationResolvers: InferResolvers<{ MenuMutation: typeof MenuMutation }, {}> = {
  MenuMutation: {
    createCoffee: (_, { name, price, sugarLevel, origin }) => {
      const id = incrementId()
      const newItem = {
        __typename: 'Coffee' as const,
        id,
        name,
        price,
        sugarLevel,
        origin,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
    updateCoffee: (_, { id, name, price, sugarLevel, origin }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Coffee') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (sugarLevel !== undefined && sugarLevel !== null) item.sugarLevel = sugarLevel
      if (origin !== undefined && origin !== null) item.origin = origin
      return item
    },
    createDessert: (_, { name, price, calories }) => {
      const id = incrementId()
      const newItem = {
        __typename: 'Dessert' as const,
        id,
        name,
        price,
        calories,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
    updateDessert: (_, { id, name, price, calories }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Dessert') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (calories !== undefined && calories !== null) item.calories = calories
      return item
    },
    deleteMenuItem: (_, { id }) => {
      const item = menuItemMap.get(id)
      if (item) menuItemMap.delete(id)
      return item || null
    },
  },
}
