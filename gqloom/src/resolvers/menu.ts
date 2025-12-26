import * as z from 'zod'
import { GraphQLError } from 'graphql'
import { resolver, query, mutation } from '@gqloom/core'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { asEnumType, asObjectType } from '@gqloom/zod'

export const Food = z.object({
  __typename: z.literal('Food').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

const SugarLevel = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])

export const Coffee = Food.extend({
  __typename: z.literal('Coffee'),
  sugarLevel: SugarLevel,
  origin: z.string(),
}).register(asObjectType, { interfaces: [Food] })

export const Dessert = Food.extend({
  __typename: z.literal('Dessert'),
  calories: z.number(),
}).register(asObjectType, { interfaces: [Food] })

export const MenuItem = z.union([Coffee, Dessert])

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

  createCoffee: mutation(Coffee)
    .input({
      name: z.string(),
      price: z.number(),
      sugarLevel: SugarLevel,
      origin: z.string(),
    })
    .resolve(({ name, price, sugarLevel, origin }) => {
      const id = incrementId()
      const newItem = { id, name, price, sugarLevel, origin, __typename: 'Coffee' as const }
      menuMap.set(id, newItem)
      return newItem
    }),

  updateCoffee: mutation(Coffee)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      price: z.number().nullish(),
      sugarLevel: SugarLevel.nullish(),
      origin: z.string().nullish(),
    })
    .resolve(({ id, name, price, sugarLevel, origin }) => {
      const item = menuMap.get(id)
      if (!item || item.__typename !== 'Coffee') throw new GraphQLError('Coffee not found')
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (sugarLevel != null) item.sugarLevel = sugarLevel
      if (origin != null) item.origin = origin
      return item as z.infer<typeof Coffee>
    }),

  createDessert: mutation(Dessert)
    .input({
      name: z.string(),
      price: z.number(),
      calories: z.number(),
    })
    .resolve(({ name, price, calories }) => {
      const id = incrementId()
      const newItem = { id, name, price, calories, __typename: 'Dessert' as const }
      menuMap.set(id, newItem)
      return newItem
    }),

  updateDessert: mutation(Dessert)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      price: z.number().nullish(),
      calories: z.number().nullish(),
    })
    .resolve(({ id, name, price, calories }) => {
      const item = menuMap.get(id)
      if (!item || item.__typename !== 'Dessert') throw new GraphQLError('Dessert not found')
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (calories != null) item.calories = calories
      return item as z.infer<typeof Dessert>
    }),

  deleteMenuItem: mutation(z.nullish(MenuItem))
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const item = menuMap.get(id)
      if (item) menuMap.delete(id)
      return item
    }),
})
