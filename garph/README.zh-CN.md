# Garph 评估报告

## 概述

Garph 是一个受 tRPC 启发的 GraphQL Schema 构建库，采用 Builder 模式，通过链式 API 定义类型和字段。本报告基于实际业务代码实现，从 5 个核心技术维度对 Garph 进行全面评估。

---

## 1. 架构模式

### 1.1 架构类型

Garph 采用 **Builder（构建器）模式**，通过函数式链式 API 显式构建 GraphQL Schema。

#### 类型定义方式

```ts
// 创建 Schema 实例
export const g = new GarphSchema()

// 定义枚举类型
export const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

// 定义对象类型
export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g.ref(() => OrderType).list().omitResolver().optional(),
})

// 定义接口
export const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})

// 实现接口
export const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)

// 定义 Union 类型
export const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})
```

#### Schema 构建过程

Garph 使用 `buildSchema()` 函数将类型定义和 Resolvers 组装成可执行的 GraphQL Schema：

```ts
// 定义 Query 和 Mutation
const Query = g.type('Query', {
  ...userQueryFields,
  ...menuQueryFields,
  ...orderQueryFields,
})

const Mutation = g.type('Mutation', {
  ...userMutationFields,
  ...menuMutationFields,
  ...orderMutationFields,
})

// 组装 Resolvers
const resolvers = {
  Query: { ...userQueryResolvers.UserQuery, ... },
  Mutation: { ...userMutationResolvers.UserMutation, ... },
  User: userResolvers.User,
  Order: orderResolvers.Order,
}

// 构建 Schema
export const schema = buildSchema({ g, resolvers })
```

### 1.2 依赖复杂度

#### 运行时依赖

根据 `garph/package.json`，Garph 的核心运行时依赖非常精简：

```json
{
  "dependencies": {
    "graphql-compose": "^9.0.10",
    "single-user-cache": "^0.6.0"
  }
}
```

- **graphql-compose**: 用于将类型定义转换为 GraphQL Schema（底层使用 GraphQL.js）
- **single-user-cache**: 用于 DataLoader 功能的缓存实现

#### 构建时依赖

- **无需额外的构建步骤**：Garph 是纯 TypeScript 实现，不需要代码生成、编译时插件或特殊的 TypeScript 配置
- **无需装饰器支持**：不依赖 `reflect-metadata` 或实验性装饰器特性
- **无需验证库绑定**：不强制绑定特定的验证库（如 `class-validator`）

#### 实际使用中的依赖

在业务代码中，除了 Garph 本身，还需要：

```json
{
  "dependencies": {
    "garph": "^0.6.8",
    "graphql": "^16.12.0",        // GraphQL 核心库（peer dependency）
    "graphql-scalars": "^1.25.0",  // 可选：自定义标量类型
    "graphql-yoga": "^5.18.0"      // 可选：GraphQL Server 实现
  }
}
```

### 1.3 构建过程分析

#### 源码实现

Garph 的 Schema 构建逻辑位于 `garph/src/schema.ts`：

```ts
export function buildSchema({ g, resolvers }: { g: GarphSchema, resolvers?: any }, config: ConverterConfig = { defaultNullability: false }) {
  const schemaComposer = new SchemaComposer();
  g.types.forEach(type => 
    schemaComposer.add(convertToGraphqlType(schemaComposer, type.typeDef.name, type, config, resolvers[type.typeDef.name]))
  )
  return schemaComposer.buildSchema()
}
```

构建过程：
1. 遍历 `GarphSchema` 实例中注册的所有类型
2. 通过 `convertToGraphqlType()` 将 Garph 类型定义转换为 `graphql-compose` 的类型
3. 使用 `SchemaComposer` 组装最终的 GraphQL Schema

#### 类型注册机制

类型通过 `GarphSchema.registerType()` 自动注册：

```ts
type<N extends string, T extends AnyTypes>(name: N, shape: T) {
  const t = new GType<N, T>(name, shape)
  this.registerType(t)
  return t
}

registerType(type: AnyType) {
  const name = type.typeDef.name
  if (!['Node', 'PageInfo'].includes(name) && this.types.has(name)) 
    throw new Error(`Type with name "${name}" already exists`)
  this.types.set(name, type)
}
```

### 1.4 架构模式评估

**优点：**
- ✅ **依赖极简**：仅 2 个运行时依赖，无需额外的构建工具或配置
- ✅ **安装即用**：无需配置 TypeScript 编译选项、无需代码生成、无需编译时插件
- ✅ **类型安全**：通过 TypeScript 泛型和类型推断提供完整的类型推导
- ✅ **模块化构建**：支持将类型定义和 Resolvers 拆分到不同文件，便于大型项目组织
- ✅ **无全局副作用**：不依赖反射元数据或全局状态，代码纯净可测试

**缺点：**
- ⚠️ **显式构建**：需要手动调用 `buildSchema()`，不如自动推断模式简洁
- ⚠️ **类型定义与 Resolver 分离**：Schema 定义和 Resolver 实现需要分开维护，存在一定程度的重复

**总结：**
Garph 的架构模式非常现代化，依赖极简，实现了"安装即用"的目标。Builder 模式虽然需要显式构建，但提供了清晰的代码组织和完整的类型安全。相比需要装饰器、反射元数据或代码生成的方案，Garph 的架构更加轻量和可维护。

---

## 2. 类型定义

### 2.1 对象类型（ObjectType）

Garph 通过 `g.type()` 方法定义对象类型，字段通过链式 API 定义：

```ts
export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g.ref(() => OrderType).list().omitResolver().optional(),
})
```

**特点：**
- 字段类型通过链式方法定义（`g.int()`, `g.string()`, `g.float()` 等）
- 支持可选字段（`.optional()`）和必需字段（`.required()`）
- 支持列表类型（`.list()`）
- 支持循环引用（通过 `g.ref(() => OrderType)` 延迟解析）

### 2.2 接口（Interface）

Garph 支持定义和实现 GraphQL Interface：

```ts
// 定义接口
export const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})

// 实现接口
export const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)
```

**特点：**
- 接口的公共字段会自动继承到实现类型中
- 实现类型只需定义特有字段，无需重复定义接口字段
- 支持多接口实现（通过数组传递）

### 2.3 联合类型（Union）

Garph 通过 `g.unionType()` 定义 Union 类型：

```ts
export const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})
```

**Union 类型的使用：**

在 Resolver 中，需要手动返回 `__typename` 字段用于类型区分：

```ts
createCoffee: (_, { name, price, sugarLevel, origin }) => {
  const newItem = {
    __typename: 'Coffee' as const,  // 必须手动添加 __typename
    id,
    name,
    price,
    sugarLevel,
    origin,
  }
  return newItem
}
```

**特点：**
- Union 类型定义直观，通过对象字面量映射类型名称到类型定义
- **需要手动处理 `__typename`**：在返回数据时必须显式添加 `__typename` 字段
- 在 Resolver 中需要通过 `__typename` 进行类型区分（如 `item.__typename !== 'Coffee'`）

### 2.4 枚举类型（Enum）

Garph 支持通过 `as const` 数组或 TypeScript enum 定义枚举：

```ts
// 方式 1: 使用 as const 数组
export const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

// 方式 2: 支持 TypeScript enum（通过源码推断）
export const SugarLevelEnum = g.enumType('SugarLevel', ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const)
```

**特点：**
- 支持直接使用 `as const` 数组，无需额外的注册步骤
- 支持 TypeScript enum（通过 `getEnumProperties` 函数处理）
- 枚举值自动映射到 GraphQL Enum

### 2.5 类型推断（Type Inference）

Garph 提供了强大的类型推断工具，可以从类型定义自动推断 TypeScript 类型：

#### Infer 工具类型

```ts
export type User = Infer<typeof UserType>
export type Coffee = Infer<typeof CoffeeType>
export type Dessert = Infer<typeof DessertType>
export type Order = Infer<typeof OrderType>
```

推断出的类型示例：

```ts
// User 类型推断结果
type User = {
  __typename?: "User"
  id: number
  name: string
  email: string
  orders?: Order[] | null | undefined
}
```

#### InferResolvers 工具类型

用于推断 Resolver 的类型签名：

```ts
export const userResolvers: InferResolvers<{ User: typeof UserType }, {}> = {
  User: {
    orders: (parent) => {
      // parent 类型自动推断为 User
      // 返回值类型自动推断为 Order[]
      return Array.from(orderMap.values()).filter((o) => o.userId === parent.id)
    },
  },
}
```

**类型推断特点：**
- `Infer<>` 自动处理可选字段、列表类型、Union 类型等复杂场景
- `InferResolvers<>` 自动推断 Resolver 的参数类型和返回值类型
- 支持 `omitResolver` 选项，可以排除标记为 `omitResolver()` 的字段
- 类型推断是编译时的，提供完整的 IDE 提示和类型检查

### 2.6 单一数据源（Single Source of Truth）

Garph 实现了**单一数据源**原则：

1. **类型定义即 Schema**：通过 `g.type()` 等 API 定义的类型，既是 GraphQL Schema 定义，也是 TypeScript 类型源
2. **自动类型推断**：通过 `Infer<>` 从类型定义推断 TypeScript 类型，无需重复定义
3. **Resolver 类型安全**：通过 `InferResolvers<>` 确保 Resolver 实现与类型定义一致

**实际使用示例：**

```ts
// 1. 定义类型（单一数据源）
export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
})

// 2. 推断 TypeScript 类型
export type User = Infer<typeof UserType>

// 3. 使用推断的类型
export const userMap = new Map<number, User>(USERS.map((u) => [u.id, u as User]))

// 4. 推断 Resolver 类型
export const userResolvers: InferResolvers<{ User: typeof UserType }, {}> = {
  User: {
    // parent 和返回值类型自动推断
  },
}
```

### 2.7 类型定义评估

**优点：**
- ✅ **单一数据源**：类型定义同时作为 GraphQL Schema 和 TypeScript 类型源，避免重复定义
- ✅ **强大的类型推断**：`Infer<>` 和 `InferResolvers<>` 提供完整的类型推导，减少手动类型定义
- ✅ **直观的 API**：链式 API 清晰易读，支持可选、列表、引用等常见场景
- ✅ **Interface 支持完善**：接口实现简洁，公共字段自动继承
- ✅ **Enum 支持灵活**：支持 `as const` 数组和 TypeScript enum，无需额外注册

**缺点：**
- ⚠️ **Union 类型需要手动处理 `__typename`**：在 Resolver 中必须手动添加 `__typename` 字段，容易遗漏
- ⚠️ **类型推断复杂度较高**：`Infer<>` 的实现较为复杂（源码中有 TODO 注释提到需要重构），可能影响类型推断性能

**总结：**
Garph 的类型定义能力非常强大，实现了单一数据源原则，类型推断功能完善。Interface 和 Enum 的支持都很直观。Union 类型虽然需要手动处理 `__typename`，但这是 GraphQL 的标准要求，其他库也需要类似处理。整体而言，类型定义是 Garph 的强项。

---

## 3. 解析器定义与输入验证

### 3.1 解析器定义方式

Garph 通过 `InferResolvers<>` 工具类型定义 Resolver，支持 Query、Mutation 和 Field Resolver。

#### Query 和 Mutation Resolver

```ts
// 1. 定义字段（包含参数）
export const userQueryFields = {
  users: g.ref(UserType).list(),
  user: g.ref(UserType).optional().args({
    id: g.int(),
  }),
}

// 2. 创建 Query 类型
const UserQuery = g.type('UserQuery', userQueryFields)

// 3. 定义 Resolver（类型自动推断）
export const userQueryResolvers: InferResolvers<{ UserQuery: typeof UserQuery }, {}> = {
  UserQuery: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {
      // args.id 类型自动推断为 number
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
}
```

#### Field Resolver

```ts
// 定义关联字段
export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g.ref(() => OrderType).list().omitResolver().optional(),
})

// 定义 Field Resolver
export const userResolvers: InferResolvers<{ User: typeof UserType }, {}> = {
  User: {
    orders: (parent) => {
      // parent 类型自动推断为 User
      return Array.from(orderMap.values()).filter((o) => o.userId === parent.id)
    },
  },
}
```

**特点：**
- Resolver 函数签名自动推断：`(parent, args, context, info) => returnValue`
- 参数类型完全自动推导，提供完整的 IDE 提示
- 支持模块化组织，可以将 Query、Mutation 和 Field Resolver 拆分到不同文件

### 3.2 参数定义与类型推导

Garph 通过 `.args()` 方法定义参数，支持可选参数和默认值：

```ts
// 必需参数
createUser: g.ref(UserType).args({
  name: g.string(),
  email: g.string(),
})

// 可选参数
updateUser: g.ref(UserType).optional().args({
  id: g.int(),
  name: g.string().optional(),
  email: g.string().optional(),
})

// 列表参数
createOrder: g.ref(OrderType).args({
  userId: g.int(),
  items: g.int().list(),  // [Int!]!
})
```

**类型推导机制：**

通过 `InferArg<>` 工具类型自动推断参数类型：

```ts
// 推断结果示例
type CreateUserArgs = {
  name: string
  email: string
}

type UpdateUserArgs = {
  id: number
  name?: string | null | undefined
  email?: string | null | undefined
}
```

在 Resolver 中，参数类型完全自动推导：

```ts
createUser: (_, { name, email }) => {
  // name: string
  // email: string
  // 类型完全自动推断，无需手动声明
}
```

### 3.3 格式验证

Garph **不提供内置的格式验证功能**，需要在 Resolver 内部手动编写验证逻辑。

#### 手动验证（当前实现方式）

```ts
createUser: (_, { name, email }) => {
  // 手动编写格式验证
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  // ... 业务逻辑
}
```

#### 通过自定义 Scalar 实现验证

Garph 支持通过自定义 Scalar 类型实现格式验证：

```ts
// 定义带验证的 Scalar
const EmailScalar = g.scalarType<string, string>('Email', {
  serialize: (value) => value,
  parseValue: (value) => {
    if (!value.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
  parseLiteral: (ast) => {
    // 处理 AST
    const value = ast.value
    if (!value.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
})

// 使用自定义 Scalar
createUser: g.ref(UserType).args({
  name: g.string(),
  email: EmailScalar,  // 使用自定义 Scalar
})
```

#### 与 Zod 集成

Garph 文档中展示了与 Zod 集成的示例：

```ts
import { z } from 'zod'

const emailValidator = z.string().email()

const EmailScalar = g.scalarType<string, string>('Email', {
  serialize: (value) => value,
  parseValue: (value) => {
    if (!emailValidator.safeParse(value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
})
```

**验证特点：**
- ❌ **无内置验证**：不提供声明式验证 API（如 `.refine()`, `.validate()`）
- ✅ **支持自定义 Scalar**：可以通过 Scalar 实现格式验证
- ✅ **支持 Zod 集成**：可以与 Zod 等验证库集成
- ⚠️ **验证逻辑分散**：格式验证需要在 Resolver 或 Scalar 中手动实现

### 3.4 自定义验证（业务逻辑验证）

Garph **不提供 Schema 级别的自定义验证功能**，所有业务逻辑验证都需要在 Resolver 内部手动编写。

#### 当前实现方式

```ts
createOrder: (_, { userId, items: itemIds }) => {
  // 1. 手动验证数组非空
  if (itemIds.length === 0) {
    throw new GraphQLError('At least one item is required')
  }
  
  // 2. 手动验证用户是否存在
  if (!userMap.has(userId)) {
    throw new GraphQLError('User not found')
  }
  
  // 3. 手动验证所有菜单项是否存在
  for (const id of itemIds) {
    if (!menuItemMap.has(id)) {
      throw new GraphQLError('Menu item not found')
    }
  }
  
  // ... 业务逻辑
}
```

**验证特点：**
- ❌ **无声明式验证**：不支持在 Schema 定义阶段注入验证函数（如 `.refine()`）
- ❌ **验证逻辑重复**：需要在每个 Resolver 中手动编写验证代码
- ⚠️ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式

### 3.5 解析器定义与输入验证评估

**优点：**
- ✅ **强大的类型推导**：`InferResolvers<>` 和 `InferArg<>` 提供完整的类型推导，参数和返回值类型完全自动推断
- ✅ **模块化组织**：支持将 Query、Mutation 和 Field Resolver 拆分到不同文件，便于大型项目组织
- ✅ **直观的参数定义**：通过 `.args()` 方法定义参数，支持可选参数和列表类型
- ✅ **支持自定义 Scalar**：可以通过自定义 Scalar 实现格式验证，支持与 Zod 等验证库集成

**缺点：**
- ❌ **无内置验证功能**：不提供声明式验证 API，格式验证和业务逻辑验证都需要手动编写
- ❌ **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用和组合
- ⚠️ **过程式验证**：验证逻辑是过程式的 `if-throw` 模式，不够声明式和优雅
- ⚠️ **验证与 Schema 分离**：验证逻辑与 Schema 定义分离，无法在 Schema 层面统一管理验证规则

**总结：**
Garph 的 Resolver 定义非常类型安全，参数类型推导能力强大。但验证功能较弱，不提供内置的声明式验证 API。格式验证可以通过自定义 Scalar 实现，但业务逻辑验证需要在 Resolver 中手动编写。相比提供声明式验证的库（如 Pothos 的 validation 插件），Garph 的验证能力较为基础。

---

## 4. 内置功能

### 4.1 Directives（指令）

**支持情况：** ❌ **不支持**

根据源码分析，Garph 不提供 Directives 的定义和使用 API。虽然底层使用的 `graphql-compose` 支持 Directives，但 Garph 的 API 层面没有暴露 Directives 功能。

**影响：**
- 无法使用 GraphQL Directives（如 `@deprecated`, `@skip`, `@include`）
- 不支持联邦架构（Federation）所需的 Directives（如 `@key`, `@external`, `@requires`）

### 4.2 Extensions（扩展）

**支持情况：** ❌ **不支持**

Garph 不提供 GraphQL Extensions 的定义和使用 API。无法在 Schema 层面声明查询复杂度（complexity）等扩展信息。

### 4.3 批量加载（DataLoader / Batching）

**支持情况：** ✅ **原生支持**

Garph 原生支持 DataLoader 功能，通过 `load` 和 `loadBatch` 方法实现批量加载和缓存。

#### 实现方式

```ts
// 定义带 Loader 的 Resolver
const resolvers: InferResolvers<{ Dog: typeof Dog }, {}> = {
  Dog: {
    owner: {
      // 使用 load 方法（带缓存）
      load: async (queries) => {
        // queries 是一个数组，包含所有需要加载的查询
        // 可以批量查询数据库，解决 N+1 问题
        return queries.map(({ parent }) => owners[parent.name])
      }
    }
  }
}
```

#### 源码实现

Garph 使用 `single-user-cache` 库实现 DataLoader 功能：

```ts
// garph/src/schema.ts
import { Factory } from 'single-user-cache'
const factory = new Factory()
const dataLoader = factory.create()

function addResolver(resolver, cacheKey: string) {
  // Loader (带缓存)
  if (resolver.load) {
    factory.add(cacheKey, { cache: true }, async (queries) => resolver.load(queries))
    return {
      resolve: (parent, args, context, info) => {
        return dataLoader[cacheKey]({ parent, args, context, info })
      }
    }
  }

  // Loader (无缓存)
  if (resolver.loadBatch) {
    factory.add(cacheKey, { cache: false }, async (queries) => resolver.loadBatch(queries))
    return {
      resolve: (parent, args, context, info) => {
        return dataLoader[cacheKey]({ parent, args, context, info })
      }
    }
  }
}
```

**特点：**
- ✅ **原生支持**：无需额外安装 DataLoader 库
- ✅ **自动批处理**：自动将多个查询合并为批量查询
- ✅ **缓存支持**：`load` 方法支持缓存，`loadBatch` 不支持缓存
- ✅ **类型安全**：Loader 函数的参数和返回值类型自动推断

### 4.4 自定义标量（Scalars）

**支持情况：** ✅ **支持**

Garph 支持通过 `g.scalarType()` 定义自定义标量类型。

#### 定义方式

```ts
// 定义 DateTime 标量
export const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})

// 使用自定义标量
export const OrderType = g.type('Order', {
  id: g.int(),
  createdAt: g.ref(DateTime),  // 使用自定义标量
})
```

**特点：**
- ✅ **类型安全**：支持泛型定义输入和输出类型
- ✅ **完整支持**：支持 `serialize`, `parseValue`, `parseLiteral` 三个方法
- ✅ **可集成第三方库**：可以集成 `graphql-scalars` 等库的标量类型

### 4.5 订阅（Subscription）

**支持情况：** ✅ **支持**

Garph 支持 GraphQL Subscriptions，通过 `g.type('Subscription', ...)` 定义。

#### 定义方式

```ts
// 定义 Subscription 类型
const subscriptionType = g.type('Subscription', {
  counter: g.int()
})

// 定义 Subscription Resolver
const resolvers: InferResolvers<{ Subscription: typeof subscriptionType }, {}> = {
  Subscription: {
    counter: {
      subscribe: async function* (parent, args, context, info) {
        // 使用 AsyncGenerator 实现订阅
        for (let i = 100; i >= 0; i--) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          yield { counter: i }
        }
      }
    }
  }
}
```

**特点：**
- ✅ **原生支持**：通过 `InferResolvers<>` 自动推断 Subscription Resolver 类型
- ✅ **AsyncGenerator 支持**：支持使用 `async function*` 实现订阅
- ✅ **类型安全**：Subscription Resolver 的参数和返回值类型自动推断

### 4.6 上下文（Context）

**支持情况：** ✅ **支持**

Garph 支持在 Resolver 中注入上下文，并通过 `InferResolvers<>` 的第二个参数定义上下文类型。

#### 定义方式

```ts
// 定义上下文类型
type MyContext = {
  user: { id: number; name: string }
  db: Database
}

// 在 InferResolvers 中指定上下文类型
const resolvers: InferResolvers<{ Query: typeof queryType }, { context: MyContext }> = {
  Query: {
    currentUser: (parent, args, context, info) => {
      // context 类型自动推断为 MyContext
      return context.user
    }
  }
}

// 在 Server 中传递上下文
const yoga = createYoga({ 
  schema, 
  context: () => ({
    user: { id: 1, name: 'Alice' },
    db: database
  })
})
```

**特点：**
- ✅ **类型安全**：上下文类型通过泛型参数定义，自动推断到 Resolver 中
- ✅ **灵活扩展**：可以扩展默认上下文（如 Yoga 的 `YogaInitialContext`）

### 4.7 中间件（Middleware）

**支持情况：** ❌ **不支持**

Garph 不提供中间件功能。无法在 Resolver 执行前后注入中间件逻辑（如日志记录、权限检查、性能监控）。

**替代方案：**
- 可以在 Resolver 函数内部手动实现中间件逻辑
- 可以在 Server 层面（如 GraphQL Yoga）使用中间件

### 4.8 内置功能评估

**优点：**
- ✅ **原生 DataLoader 支持**：内置批量加载和缓存功能，解决 N+1 问题
- ✅ **订阅支持完善**：支持 GraphQL Subscriptions，类型安全
- ✅ **上下文类型安全**：上下文类型自动推断，提供完整的类型安全
- ✅ **自定义标量支持**：支持定义自定义标量类型，可集成第三方库

**缺点：**
- ❌ **无 Directives 支持**：不支持 GraphQL Directives，无法使用联邦架构
- ❌ **无 Extensions 支持**：不支持 GraphQL Extensions，无法声明查询复杂度
- ❌ **无中间件支持**：不提供中间件功能，需要在 Resolver 或 Server 层面手动实现

**总结：**
Garph 在核心功能（DataLoader、Subscription、Context）方面支持良好，但在高级功能（Directives、Extensions、Middleware）方面支持不足。对于不需要联邦架构或复杂中间件的项目，Garph 的功能已经足够。但对于需要这些高级功能的项目，可能需要考虑其他方案或手动实现。

---

## 5. 生态集成

### 5.1 ORM 集成

**支持情况：** ❌ **无官方插件**

根据源码和文档分析，Garph **不提供官方的 ORM 集成插件**（如 Prisma、Drizzle、TypeORM 插件）。

**影响：**
- 无法直接复用数据库模型定义
- 无法自动生成高效的数据库查询
- 需要在 Resolver 中手动编写数据库查询逻辑

**替代方案：**
- 可以在 Resolver 中手动使用 ORM（如 Prisma Client）进行数据库查询
- 可以通过 `Infer<>` 工具类型从数据库模型推断 GraphQL 类型（需要手动映射）

### 5.2 验证库集成

**支持情况：** ✅ **支持（通过自定义 Scalar）**

Garph 支持与验证库（如 Zod）集成，但需要通过自定义 Scalar 实现。

#### Zod 集成示例

```ts
import { z } from 'zod'
import { g } from 'garph'
import { GraphQLError } from 'graphql'

// 定义 Zod Schema
const emailValidator = z.string().email()

// 创建自定义 Scalar
const EmailScalar = g.scalarType<string, string>('Email', {
  serialize: (value) => value,
  parseValue: (value) => {
    if (!emailValidator.safeParse(value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
})

// 使用自定义 Scalar
createUser: g.ref(UserType).args({
  name: g.string(),
  email: EmailScalar,  // 使用 Zod 验证的 Scalar
})
```

**特点：**
- ✅ **支持 Zod 集成**：可以通过自定义 Scalar 使用 Zod 进行验证
- ⚠️ **需要手动实现**：需要为每个验证规则创建自定义 Scalar
- ⚠️ **验证与 Schema 分离**：验证逻辑在 Scalar 中，不在 Schema 定义层面

### 5.3 Server 兼容性

**支持情况：** ✅ **广泛支持**

Garph 支持多种 GraphQL Server 和 Web 框架。

#### GraphQL Server

**GraphQL Yoga**（官方推荐）

```ts
import { createYoga } from 'graphql-yoga'
import { buildSchema } from 'garph'

const schema = buildSchema({ g, resolvers })
const yoga = createYoga({ schema })
```

**Apollo Server**

Garph 生成的 Schema 是标准的 GraphQL Schema，可以直接用于 Apollo Server：

```ts
import { ApolloServer } from 'apollo-server'
import { buildSchema } from 'garph'

const schema = buildSchema({ g, resolvers })
const server = new ApolloServer({ schema })
```

**Mercurius**（Fastify GraphQL）

```ts
import mercurius from 'mercurius'
import { buildSchema } from 'garph'

const schema = buildSchema({ g, resolvers })
fastify.register(mercurius, { schema })
```

#### Web 框架

**Next.js**

Garph 提供 Next.js 集成示例，支持 API Routes：

```ts
// pages/api/graphql.ts
import { buildSchema } from 'garph'
import { createYoga } from 'graphql-yoga'

const schema = buildSchema({ g, resolvers })
const yoga = createYoga({ schema })

export default yoga
```

**Nuxt**

Garph 支持 Nuxt 集成，可以通过 Server Routes 使用。

**Remix**

Garph 支持 Remix 集成，可以通过 Resource Routes 使用。

**特点：**
- ✅ **标准 GraphQL Schema**：Garph 生成的 Schema 是标准的 GraphQL Schema，兼容所有 GraphQL Server
- ✅ **官方文档完善**：提供 GraphQL Yoga、Apollo Server、Mercurius 的集成文档
- ✅ **框架支持广泛**：支持 Next.js、Nuxt、Remix 等主流框架

### 5.4 Client 集成

**支持情况：** ✅ **支持多种客户端**

Garph 提供多种 GraphQL 客户端的集成支持。

#### GQty（官方集成）

Garph 提供官方的 GQty 集成（`@garph/gqty`），提供 tRPC 风格的客户端体验：

```ts
import { InferClient, createClient } from '@garph/gqty'
import { queryType } from './schema'

type ClientTypes = InferClient<{ query: typeof queryType }>

export const { useQuery, ... } = createClient<ClientTypes>({
  generatedSchema: createGeneratedSchema(schema),
  scalarsEnumsHash: createScalarsEnumsHash(schema),
  url: 'http://localhost:4000/graphql'
})
```

#### 其他客户端

- **urql**：支持，有官方文档
- **Vue Apollo**：支持，有官方文档
- **fetch**：支持，可以使用标准的 fetch API

**特点：**
- ✅ **官方 GQty 集成**：提供 tRPC 风格的客户端体验，类型安全
- ✅ **标准 GraphQL**：生成的 Schema 是标准 GraphQL，兼容所有 GraphQL 客户端

### 5.5 生态集成评估

**优点：**
- ✅ **Server 兼容性优秀**：生成的 Schema 是标准 GraphQL Schema，兼容所有 GraphQL Server
- ✅ **框架支持广泛**：支持 Next.js、Nuxt、Remix 等主流框架
- ✅ **客户端集成完善**：提供官方 GQty 集成，支持多种客户端
- ✅ **验证库集成**：支持与 Zod 等验证库集成（通过自定义 Scalar）

**缺点：**
- ❌ **无 ORM 集成**：不提供官方的 ORM 插件，无法直接复用数据库模型
- ⚠️ **验证集成需要手动实现**：虽然支持 Zod 集成，但需要为每个验证规则创建自定义 Scalar

**总结：**
Garph 在 Server 和框架兼容性方面表现优秀，生成的 Schema 是标准 GraphQL Schema，可以无缝集成到任何 GraphQL Server 和框架中。但在 ORM 集成方面支持不足，需要手动编写数据库查询逻辑。验证库集成虽然支持，但需要手动实现，不如提供声明式验证 API 的库方便。

---

## 总结

Garph 是一个现代化的 GraphQL Schema 构建库，在架构模式、类型定义和 Server 兼容性方面表现优秀，但在验证功能和 ORM 集成方面支持不足。适合不需要复杂验证和 ORM 集成的项目，特别是追求轻量级和类型安全的项目。

### 核心优势

1. **极简依赖**：仅 2 个运行时依赖，安装即用
2. **强大的类型推断**：`Infer<>` 和 `InferResolvers<>` 提供完整的类型推导
3. **单一数据源**：类型定义同时作为 GraphQL Schema 和 TypeScript 类型源
4. **原生 DataLoader 支持**：内置批量加载和缓存功能
5. **广泛的 Server 兼容性**：标准 GraphQL Schema，兼容所有 GraphQL Server

### 主要不足

1. **验证功能较弱**：不提供声明式验证 API，需要在 Resolver 中手动编写验证逻辑
2. **无 ORM 集成**：不提供官方的 ORM 插件
3. **无 Directives 支持**：不支持 GraphQL Directives，无法使用联邦架构
4. **无中间件支持**：不提供中间件功能

### 适用场景

- ✅ 追求轻量级和类型安全的项目
- ✅ 不需要复杂验证逻辑的项目
- ✅ 不需要 ORM 集成的项目
- ✅ 不需要联邦架构的项目
- ❌ 需要声明式验证的项目
- ❌ 需要 ORM 深度集成的项目
- ❌ 需要联邦架构的项目

