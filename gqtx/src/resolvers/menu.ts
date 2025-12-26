import { Gql } from 'gqtx'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import { MenuItemType, menuItemMap, MenuCategoryEnum } from './types.ts'
import type { MenuItem } from './types.ts'

export const menuQueryFields = [
  Gql.Field({
    name: 'menu',
    type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
    resolve: () => Array.from(menuItemMap.values()),
  }),
  Gql.Field({
    name: 'menuItems',
    type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
    resolve: () => Array.from(menuItemMap.values()),
  }),
  Gql.Field({
    name: 'menuItem',
    type: MenuItemType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    },
    resolve: (_, { id }) => {
      const item = menuItemMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return item
    },
  }),
]

export const menuMutationFields = [
  Gql.Field({
    name: 'createMenuItem',
    type: Gql.NonNull(MenuItemType),
    args: {
      name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      price: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
      category: Gql.Arg({ type: Gql.NonNullInput(MenuCategoryEnum) }),
    },
    resolve: (_, { name, price, category }) => {
      const id = incrementId()
      const newItem: MenuItem = { id, name, price, category: category as 'COFFEE' | 'FOOD' }
      menuItemMap.set(id, newItem)
      return newItem
    },
  }),
  Gql.Field({
    name: 'updateMenuItem',
    type: MenuItemType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      name: Gql.Arg({ type: Gql.String }),
      price: Gql.Arg({ type: Gql.Float }),
      category: Gql.Arg({ type: MenuCategoryEnum }),
    },
    resolve: (_, { id, name, price, category }) => {
      const item = menuItemMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (category !== undefined && category !== null) item.category = category as 'COFFEE' | 'FOOD'
      return item
    },
  }),
  Gql.Field({
    name: 'deleteMenuItem',
    type: MenuItemType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    },
    resolve: (_, { id }) => {
      const item = menuItemMap.get(id)
      if (item) menuItemMap.delete(id)
      return item ?? null
    },
  }),
]
