import 'reflect-metadata'
import { Resolver, Query, Mutation, Arg, Int, Float } from 'type-graphql'
import { GraphQLError } from 'graphql'
import { MENU_ITEMS, incrementId } from '@coffee-shop/shared'
import { MenuItem, MenuCategory } from './menu.type.ts'

export const menuMap = new Map<number, MenuItem>(
  MENU_ITEMS.map((i) => [i.id, Object.assign(new MenuItem(), i)]),
)

@Resolver(() => MenuItem)
export class MenuResolver {
  @Query(() => [MenuItem])
  menu(): MenuItem[] {
    return Array.from(menuMap.values())
  }

  @Query(() => MenuItem)
  menuItem(@Arg('id', () => Int) id: number): MenuItem {
    const item = menuMap.get(id)
    if (!item) throw new GraphQLError('Menu item not found')
    return item
  }

  @Mutation(() => MenuItem)
  createMenuItem(
    @Arg('name', () => String) name: string,
    @Arg('price', () => Float) price: number,
    @Arg('category', () => MenuCategory) category: MenuCategory,
  ): MenuItem {
    const id = incrementId()
    const newItem = Object.assign(new MenuItem(), { id, name, price, category })
    menuMap.set(id, newItem)
    return newItem
  }

  @Mutation(() => MenuItem)
  updateMenuItem(
    @Arg('id', () => Int) id: number,
    @Arg('name', () => String, { nullable: true }) name?: string,
    @Arg('price', () => Float, { nullable: true }) price?: number,
    @Arg('category', () => MenuCategory, { nullable: true }) category?: MenuCategory,
  ): MenuItem {
    const item = menuMap.get(id)
    if (!item) throw new GraphQLError('Menu item not found')

    if (name != null) item.name = name
    if (price != null) item.price = price
    if (category != null) item.category = category

    return item
  }

  @Mutation(() => MenuItem, { nullable: true })
  deleteMenuItem(@Arg('id', () => Int) id: number): MenuItem | null {
    const item = menuMap.get(id)
    if (item) menuMap.delete(id)
    return item || null
  }
}

