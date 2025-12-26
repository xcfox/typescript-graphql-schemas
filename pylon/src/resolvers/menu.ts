import { Int } from '@getcronit/pylon'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'

// Enums
export type MenuCategory = 'COFFEE' | 'FOOD'

// In-memory data map
export const menuItemMap = new Map<
  number,
  { id: number; name: string; price: number; category: MenuCategory }
>(MENU_ITEMS.map((item) => [item.id, { ...item } as any]))

// Model Class
export class MenuItem {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public category: MenuCategory,
  ) {}
}

export const menuQueries = {
  menu: (): MenuItem[] => {
    return Array.from(menuItemMap.values()).map(
      (i) => new MenuItem(i.id, i.name, i.price, i.category),
    )
  },
  menuItem: (id: Int): MenuItem | undefined => {
    const i = menuItemMap.get(id)
    if (!i) return undefined
    return new MenuItem(i.id, i.name, i.price, i.category)
  },
}

export const menuMutations = {
  createMenuItem: (name: string, price: number, category: MenuCategory): MenuItem => {
    const id = incrementId()
    const newItem = { id, name, price, category }
    menuItemMap.set(id, newItem)
    return new MenuItem(id, name, price, category)
  },
  updateMenuItem: (id: Int, price?: number): MenuItem | undefined => {
    const item = menuItemMap.get(id)
    if (!item) return undefined
    if (price !== undefined) item.price = price
    return new MenuItem(item.id, item.name, item.price, item.category)
  },
  deleteMenuItem: (id: Int): MenuItem | undefined => {
    const item = menuItemMap.get(id)
    if (item) {
      menuItemMap.delete(id)
      return new MenuItem(item.id, item.name, item.price, item.category)
    }
    return undefined
  },
}
