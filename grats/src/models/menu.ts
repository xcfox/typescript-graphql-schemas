import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { GraphQLError } from 'graphql'
import type { Int, Float } from 'grats'

/**
 * Menu category
 * @gqlEnum
 */
export type MenuCategory = 'COFFEE' | 'FOOD'

/**
 * Menu item information
 * @gqlType
 */
export type MenuItem = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  category: MenuCategory
}

export const menuMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, { ...item } as unknown as MenuItem]),
)

/** @gqlQueryField */
export function menu(): MenuItem[] {
  return Array.from(menuMap.values())
}

/** @gqlQueryField */
export function menuItems(): MenuItem[] {
  return menu()
}

/** @gqlQueryField */
export function menuItem(id: Int): MenuItem {
  const item = menuMap.get(id)
  if (!item) throw new GraphQLError('Menu item not found')
  return item
}

/** @gqlMutationField */
export function createMenuItem(name: string, price: Float, category: MenuCategory): MenuItem {
  const id = incrementId()
  const newItem = { id, name, price, category } as unknown as MenuItem
  menuMap.set(id, newItem)
  return newItem
}

/** @gqlMutationField */
export function updateMenuItem(
  id: Int,
  name?: string | null,
  price?: Float | null,
  category?: MenuCategory | null,
): MenuItem {
  const item = menuMap.get(id)
  if (!item) throw new GraphQLError('Menu item not found')
  if (name != null) item.name = name
  if (price != null) item.price = price
  if (category != null) item.category = category
  return item
}

/** @gqlMutationField */
export function deleteMenuItem(id: Int): MenuItem | null {
  const item = menuMap.get(id)
  if (item) menuMap.delete(id)
  return item || null
}
