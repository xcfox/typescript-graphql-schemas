import { builder } from '../builder.ts'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'

// SugarLevel 枚举
export const SugarLevel = builder.enumType('SugarLevel', {
  values: ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const,
})

interface IFood {
  id: number
  name: string
  price: number
}
// 类型定义
interface ICoffee extends IFood {
  __typename: 'Coffee'
  sugarLevel: typeof SugarLevel.$inferType
  origin: string
}

interface IDessert extends IFood {
  __typename: 'Dessert'
  calories: number
}

type MenuItemType = ICoffee | IDessert

// Food Interface（公共字段）
export const Food = builder.interfaceRef<IFood>('Food').implement({
  fields: (t) => ({
    id: t.int(),
    name: t.string(),
    price: t.float(),
  }),
})

// Coffee 类型，实现 Food 接口
export const Coffee = builder.objectRef<ICoffee>('Coffee').implement({
  interfaces: [Food],
  fields: (t) => ({
    sugarLevel: t.field({
      type: SugarLevel,
      resolve: (parent) => parent.sugarLevel,
    }),
    origin: t.string({ resolve: (parent) => parent.origin }),
  }),
})

// Dessert 类型，实现 Food 接口
export const Dessert = builder.objectRef<IDessert>('Dessert').implement({
  interfaces: [Food],
  fields: (t) => ({
    calories: t.float({ resolve: (parent) => parent.calories }),
  }),
})

// Union 类型: MenuItem = Coffee | Dessert
export const MenuItem = builder.unionType('MenuItem', {
  types: [Coffee, Dessert],
  resolveType: (item) => {
    if (item && typeof item === 'object' && '__typename' in item) {
      return item.__typename === 'Coffee' ? Coffee : Dessert
    }
    return null
  },
})

// In-memory data store
export const menuMap = new Map<number, MenuItemType>(
  MENU_ITEMS.map((i) => [i.id, i as MenuItemType]),
)

builder.queryFields((t) => ({
  menu: t.field({
    type: [MenuItem],
    resolve: () => Array.from(menuMap.values()),
  }),
  menuItem: t.field({
    type: MenuItem,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      return item
    },
  }),
}))

builder.mutationFields((t) => ({
  createCoffee: t.field({
    type: Coffee,
    args: {
      name: t.arg.string({ required: true }),
      price: t.arg.float({ required: true }),
      sugarLevel: t.arg({ type: SugarLevel, required: true }),
      origin: t.arg.string({ required: true }),
    },
    resolve: (_parent, { name, price, sugarLevel, origin }) => {
      const id = incrementId()
      const newItem: ICoffee = {
        __typename: 'Coffee',
        id,
        name,
        price,
        sugarLevel: sugarLevel as typeof SugarLevel.$inferType,
        origin,
      }
      menuMap.set(id, newItem)
      return newItem
    },
  }),
  updateCoffee: t.field({
    type: Coffee,
    args: {
      id: t.arg.int({ required: true }),
      name: t.arg.string(),
      price: t.arg.float(),
      sugarLevel: t.arg({ type: SugarLevel }),
      origin: t.arg.string(),
    },
    resolve: (_parent, { id, name, price, sugarLevel, origin }) => {
      const item = menuMap.get(id)
      if (!item || item.__typename !== 'Coffee') {
        throw new GraphQLError('Coffee not found')
      }
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (sugarLevel != null) item.sugarLevel = sugarLevel as typeof SugarLevel.$inferType
      if (origin != null) item.origin = origin
      return item
    },
  }),
  createDessert: t.field({
    type: Dessert,
    args: {
      name: t.arg.string({ required: true }),
      price: t.arg.float({ required: true }),
      calories: t.arg.float({ required: true }),
    },
    resolve: (_parent, { name, price, calories }) => {
      const id = incrementId()
      const newItem: IDessert = {
        __typename: 'Dessert',
        id,
        name,
        price,
        calories,
      }
      menuMap.set(id, newItem)
      return newItem
    },
  }),
  updateDessert: t.field({
    type: Dessert,
    args: {
      id: t.arg.int({ required: true }),
      name: t.arg.string(),
      price: t.arg.float(),
      calories: t.arg.float(),
    },
    resolve: (_parent, { id, name, price, calories }) => {
      const item = menuMap.get(id)
      if (!item || item.__typename !== 'Dessert') {
        throw new GraphQLError('Dessert not found')
      }
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (calories != null) item.calories = calories
      return item
    },
  }),
  deleteMenuItem: t.field({
    type: MenuItem,
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: (_parent, { id }) => {
      const item = menuMap.get(id)
      if (item) menuMap.delete(id)
      return item || null
    },
  }),
}))
