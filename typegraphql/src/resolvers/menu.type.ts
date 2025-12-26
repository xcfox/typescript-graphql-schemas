import {
  Field,
  ObjectType,
  InterfaceType,
  registerEnumType,
  Int,
  Float,
  createUnionType,
} from 'type-graphql'

// SugarLevel 枚举
export enum SugarLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

registerEnumType(SugarLevel, {
  name: 'SugarLevel',
})

// Food Interface（公共字段）
@InterfaceType()
export abstract class Food {
  @Field(() => Int)
  id!: number

  @Field(() => String)
  name!: string

  @Field(() => Float)
  price!: number
}

// Coffee 类型，实现 Food 接口
@ObjectType({ implements: Food })
export class Coffee implements Food {
  @Field(() => Int)
  id!: number

  @Field(() => String)
  name!: string

  @Field(() => Float)
  price!: number

  @Field(() => SugarLevel)
  sugarLevel!: SugarLevel

  @Field(() => String)
  origin!: string
}

// Dessert 类型，实现 Food 接口
@ObjectType({ implements: Food })
export class Dessert implements Food {
  @Field(() => Int)
  id!: number

  @Field(() => String)
  name!: string

  @Field(() => Float)
  price!: number

  @Field(() => Float)
  calories!: number
}

// Union 类型: MenuItem = Coffee | Dessert
export const MenuItem = createUnionType({
  name: 'MenuItem',
  types: () => [Coffee, Dessert] as const,
  resolveType: (value) => {
    if ('__typename' in value && value.__typename === 'Coffee') {
      return 'Coffee'
    }
    if ('__typename' in value && value.__typename === 'Dessert') {
      return 'Dessert'
    }
    return null
  },
})
