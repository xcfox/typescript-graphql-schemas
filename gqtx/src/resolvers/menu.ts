import { Gql } from 'gqtx'
import { incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import { MenuItemType, CoffeeType, DessertType, menuItemMap, SugarLevelEnum } from './types.ts'
import type { Coffee, Dessert } from './types.ts'

export const menuQueryFields = [
  Gql.Field({
    name: 'menu',
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
    name: 'createCoffee',
    type: Gql.NonNull(CoffeeType),
    args: {
      name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      price: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
      sugarLevel: Gql.Arg({ type: Gql.NonNullInput(SugarLevelEnum) }),
      origin: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    },
    resolve: (_, { name, price, sugarLevel, origin }) => {
      const id = incrementId()
      const newItem: Coffee = {
        __typename: 'Coffee',
        id,
        name,
        price,
        sugarLevel: sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH',
        origin,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
  }),
  Gql.Field({
    name: 'updateCoffee',
    type: CoffeeType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      name: Gql.Arg({ type: Gql.String }),
      price: Gql.Arg({ type: Gql.Float }),
      sugarLevel: Gql.Arg({ type: SugarLevelEnum }),
      origin: Gql.Arg({ type: Gql.String }),
    },
    resolve: (_, { id, name, price, sugarLevel, origin }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Coffee') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (sugarLevel !== undefined && sugarLevel !== null)
        item.sugarLevel = sugarLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
      if (origin !== undefined && origin !== null) item.origin = origin
      return item
    },
  }),
  Gql.Field({
    name: 'createDessert',
    type: Gql.NonNull(DessertType),
    args: {
      name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      price: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
      calories: Gql.Arg({ type: Gql.NonNullInput(Gql.Float) }),
    },
    resolve: (_, { name, price, calories }) => {
      const id = incrementId()
      const newItem: Dessert = {
        __typename: 'Dessert',
        id,
        name,
        price,
        calories,
      }
      menuItemMap.set(id, newItem)
      return newItem
    },
  }),
  Gql.Field({
    name: 'updateDessert',
    type: DessertType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      name: Gql.Arg({ type: Gql.String }),
      price: Gql.Arg({ type: Gql.Float }),
      calories: Gql.Arg({ type: Gql.Float }),
    },
    resolve: (_, { id, name, price, calories }) => {
      const item = menuItemMap.get(id)
      if (!item || item.__typename !== 'Dessert') return null
      if (name !== undefined && name !== null) item.name = name
      if (price !== undefined && price !== null) item.price = price
      if (calories !== undefined && calories !== null) item.calories = calories
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
