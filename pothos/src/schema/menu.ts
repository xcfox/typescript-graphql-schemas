import { builder, type InferPothosObject } from '../builder.ts'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'

export const MenuCategory = {
  COFFEE: 'COFFEE',
  FOOD: 'FOOD',
} as const

export type MenuCategory = (typeof MenuCategory)[keyof typeof MenuCategory]

builder.enumType(MenuCategory, {
  name: 'MenuCategory',
})

export const MenuItemRef = builder.simpleObject('Menu', {
  fields: (t) => ({
    id: t.int(),
    name: t.string(),
    price: t.float(),
    category: t.field({ type: MenuCategory }),
  }),
})

// 移除 MenuItemShape，通过推导获取类型
export const menuMap = new Map<number, InferPothosObject<typeof MenuItemRef>>(
  MENU_ITEMS.map((i) => [i.id, i as InferPothosObject<typeof MenuItemRef>]),
)

builder.queryFields((t) => ({
  menu: t.field({
    type: [MenuItemRef],
    resolve: () => Array.from(menuMap.values()),
  }),
  menuItem: t.field({
    type: MenuItemRef,
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
  createMenuItem: t.field({
    type: MenuItemRef,
    args: {
      name: t.arg.string({ required: true }),
      price: t.arg.float({ required: true }),
      category: t.arg({ type: MenuCategory, required: true }),
    },
    resolve: (_parent, { name, price, category }) => {
      const id = incrementId()
      const newItem = { id, name, price, category }
      menuMap.set(id, newItem)
      return newItem
    },
  }),
  updateMenuItem: t.field({
    type: MenuItemRef,
    args: {
      id: t.arg.int({ required: true }),
      name: t.arg.string(),
      price: t.arg.float(),
      category: t.arg({ type: MenuCategory }),
    },
    resolve: (_parent, { id, name, price, category }) => {
      const item = menuMap.get(id)
      if (!item) throw new GraphQLError('Menu item not found')
      if (name != null) item.name = name
      if (price != null) item.price = price
      if (category != null) item.category = category
      return item
    },
  }),
  deleteMenuItem: t.field({
    type: MenuItemRef,
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
