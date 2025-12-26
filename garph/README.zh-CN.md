# Garph 评估报告

## 📋 基本信息

- **官网**: [https://garph.dev/](https://garph.dev/)
- **仓库地址**: [https://github.com/stepci/garph](https://github.com/stepci/garph)
- **首次 Release**: 2023-02-20 (v0.0.1)
- **最新 Release**: 2024-02-25 (v0.6.8)

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 7 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 1. 架构模式

**评估结果：Builder（构建器）模式**

Garph 采用典型的 **Builder（构建器）模式**，通过函数式 API 显式构建类型定义。

#### 实现方式

- **Schema 实例化**：通过 `new GarphSchema()` 创建 schema 实例 `g`
- **类型定义**：使用链式 API 定义类型
  ```typescript
  export const UserType = g.type('User', {
    id: g.int(),
    name: g.string(),
    email: g.string(),
  })
  ```
- **Schema 构建**：通过 `buildSchema({ g, resolvers })` 组装最终的可执行 GraphQL Schema

#### 优势

- ✅ **无运行时反射**：不依赖反射元数据，运行时开销小
- ✅ **代码纯净**：纯函数式 API，易于测试和调试
- ✅ **模块化构建**：Schema 定义和 Resolver 可以分离，支持大型项目的模块化组织
- ✅ **类型安全**：通过 TypeScript 泛型和类型推断提供完整的类型安全

#### 劣势

- ⚠️ **显式定义**：需要手动定义每个字段，相比自动推断模式代码量稍多
- ⚠️ **构建步骤**：需要显式调用 `buildSchema()` 进行构建

**代码示例**：
```typescript
// garph/src/schema.ts (lines 1-6)
import { GarphSchema, buildSchema } from 'garph'
import type { Infer, InferResolvers } from 'garph'
import { GraphQLDateTime } from 'graphql-scalars'
import { USERS, MENU_ITEMS, ORDERS } from '@coffee-shop/shared'

export const g = new GarphSchema()
```

```typescript
// garph/src/server.ts (line 53)
export const schema = buildSchema({ g, resolvers })
```

---

### 2. 依赖复杂度

**评估结果：依赖较少，轻量级**

#### 核心依赖

- `garph` - 核心库
- `graphql` - GraphQL 运行时

#### 额外依赖

- `graphql-scalars` - 用于自定义标量类型（如 DateTime）
- `graphql-yoga` - GraphQL 服务器（仅用于示例，非必需）

#### 评估

- ✅ **无强制依赖**：不依赖反射元数据（reflect-metadata）、类验证器（class-validator）等
- ✅ **轻量级**：核心依赖仅 2 个，体积小
- ✅ **灵活选择**：可以自由选择 GraphQL 服务器（Apollo Server、Yoga 等）

**依赖清单**：
```json
// garph/package.json (lines 10-16)
  "dependencies": {
    "@coffee-shop/shared": "workspace:*",
    "garph": "^0.6.8",
    "graphql": "^16.12.0",
    "graphql-scalars": "^1.25.0",
    "graphql-yoga": "^5.18.0"
  }
```

---

### 3. 类型定义

**评估结果：支持完整，类型推断优秀**

#### 对象类型

使用 `g.type()` 定义对象类型，字段通过链式 API 定义：

```typescript
// garph/src/schema.ts (lines 22-31)
export const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
  orders: g
    .ref(() => OrderType)
    .list()
    .omitResolver()
    .optional(),
})
```

#### 联合类型 (Union)

支持 Union 类型定义，通过对象映射方式：

```typescript
// garph/src/schema.ts (lines 55-59)
// Union 类型: MenuItem = Coffee | Dessert
export const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})
```

- ✅ **支持内联片段**：完全支持 GraphQL 内联片段查询

#### 接口 (Interface)

支持 Interface 定义和实现：

```typescript
// garph/src/schema.ts (lines 33-38)
// Interface: Food (公共字段)
export const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})
```

```typescript
// garph/src/schema.ts (lines 40-46)
// Coffee 类型，实现 Food 接口
export const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)
```

- ✅ **直观的实现方式**：通过 `.implements()` 方法实现接口
- ✅ **自动继承公共字段**：接口字段自动继承，无需重复定义

#### 枚举类型 (Enum)

直接使用 `as const` 数组定义枚举，无需手动注册：

```typescript
// garph/src/schema.ts (lines 14-20)
export const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

export const SugarLevelEnum = g.enumType('SugarLevel', ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const)
```

- ✅ **直接映射**：支持直接使用 `as const` 数组，无需重复定义名称
- ✅ **类型安全**：TypeScript 类型与 GraphQL 枚举自动同步

#### 类型推断

支持从 Schema 定义推断 TypeScript 类型：

```typescript
// garph/src/schema.ts (lines 71-75)
export type User = Infer<typeof UserType>
export type Coffee = Infer<typeof CoffeeType>
export type Dessert = Infer<typeof DessertType>
export type MenuItem = Coffee | Dessert
export type Order = Infer<typeof OrderType>
```

- ✅ **单一数据源**：Schema 定义是单一数据源，可以同时生成 GraphQL Schema 和 TypeScript 类型
- ✅ **类型同步**：杜绝类型不同步问题

---

### 4. 解析器定义

**评估结果：类型安全，模块化组织良好**

#### 类型安全的 Resolver

使用 `InferResolvers` 进行类型推断，确保 Resolver 与 Schema 定义匹配：

```typescript
// garph/src/resolvers/user.ts (lines 6-12)
export const userResolvers: InferResolvers<{ User: typeof UserType }, {}> = {
  User: {
    orders: (parent) => {
      return Array.from(orderMap.values()).filter((o) => o.userId === parent.id)
    },
  },
}
```

- ✅ **完整类型推导**：`InferResolvers` 自动推断参数和返回值类型
- ✅ **编译时检查**：类型不匹配会在编译时报错

#### 模块化组织

支持将 Schema 定义和 Resolver 按领域模块化组织：

```typescript
// garph/src/resolvers/user.ts (lines 14-32)
export const userQueryFields = {
  users: g.ref(UserType).list(),
  user: g.ref(UserType).optional().args({
    id: g.int(),
  }),
}

const UserQuery = g.type('UserQuery', userQueryFields)

export const userQueryResolvers: InferResolvers<{ UserQuery: typeof UserQuery }, {}> = {
  UserQuery: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
}
```

- ✅ **高内聚**：每个模块（user、menu、order）包含完整的 Query、Mutation 和关联 Resolver
- ✅ **易于维护**：业务逻辑与 Schema 定义可以分离，也可以紧密集成
- ✅ **支持 DDD**：适合领域驱动开发的组织方式

#### Schema 组装

在 `server.ts` 中统一组装所有模块：

```typescript
// garph/src/server.ts (lines 26-51)
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

const resolvers = {
  Query: {
    ...userQueryResolvers.UserQuery,
    ...menuQueryResolvers.MenuQuery,
    ...orderQueryResolvers.OrderQuery,
  },
  Mutation: {
    ...userMutationResolvers.UserMutation,
    ...menuMutationResolvers.MenuMutation,
    ...orderMutationResolvers.OrderMutation,
  },
  User: userResolvers.User,
  Order: orderResolvers.Order,
}
```

---

### 5. 输入验证与参数定义

**评估结果：参数定义优秀，验证需要手动实现**

#### 参数定义

使用链式 API 定义参数，支持可选参数：

```typescript
// garph/src/resolvers/user.ts (lines 14-19)
export const userQueryFields = {
  users: g.ref(UserType).list(),
  user: g.ref(UserType).optional().args({
    id: g.int(),
  }),
}
```

```typescript
// garph/src/resolvers/user.ts (lines 34-47)
export const userMutationFields = {
  createUser: g.ref(UserType).args({
    name: g.string(),
    email: g.string(),
  }),
  updateUser: g.ref(UserType).optional().args({
    id: g.int(),
    name: g.string().optional(),
    email: g.string().optional(),
  }),
  deleteUser: g.ref(UserType).optional().args({
    id: g.int(),
  }),
}
```

- ✅ **链式调用**：符合 TypeScript 直觉的链式 API
- ✅ **完整类型推导**：参数类型自动推断，提供完整的 IDE 提示
- ✅ **可选参数**：通过 `.optional()` 支持可选参数

#### 格式验证

格式验证需要在 Resolver 中手动实现：

```typescript
// garph/src/resolvers/user.ts (lines 51-59)
export const userMutationResolvers: InferResolvers<{ UserMutation: typeof UserMutation }, {}> = {
  UserMutation: {
    createUser: (_, { name, email }) => {
      if (!email.includes('@')) throw new GraphQLError('Invalid email format')
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    },
```

- ⚠️ **手动验证**：需要在 Resolver 内部手动编写验证逻辑
- ⚠️ **无声明式验证**：不支持在 Schema 定义阶段注入验证函数
- ⚠️ **无验证库集成**：未看到与 Zod、Valibot 等验证库的深度集成

#### 自定义验证

复杂业务逻辑验证同样需要在 Resolver 中手动实现：

```typescript
// garph/src/resolvers/order.ts (lines 61-74)
  OrderMutation: {
    createOrder: (_, { userId, items: itemIds }) => {
      if (itemIds.length === 0) {
        throw new GraphQLError('At least one item is required')
      }
      if (!userMap.has(userId)) {
        throw new GraphQLError('User not found')
      }
      for (const id of itemIds) {
        if (!menuItemMap.has(id)) {
          throw new GraphQLError('Menu item not found')
        }
      }
```

- ⚠️ **过程式验证**：需要手动编写 `if-throw` 逻辑
- ⚠️ **不易复用**：验证逻辑难以复用和组合
- ⚠️ **可维护性一般**：复杂验证逻辑会增加 Resolver 的复杂度

#### 总结

- ✅ **参数定义优秀**：链式 API 清晰，类型推导完整
- ⚠️ **验证能力有限**：缺乏声明式验证，需要手动实现所有验证逻辑
- ⚠️ **可改进空间**：可以引入验证库集成或提供内置验证 API

---

### 6. 内置功能

**评估结果：功能较为完整，部分功能开发中**

#### 批量加载 (Batching)

Garph 原生支持 DataLoader 模式，通过 `load` 和 `loadBatch` 函数优雅地解决 N+1 查询问题。

**实现方式**：
- 字段 resolver 可以返回包含 `load` 或 `loadBatch` 函数的对象
- `load` 函数支持缓存，`loadBatch` 函数不支持缓存
- 自动批量处理多个查询请求

**文档参考**：[Loaders | Garph](https://garph.dev/docs/guide/loaders.html)

- ✅ **原生支持**：内置批量加载机制，无需额外依赖 DataLoader 库
- ✅ **类型安全**：与核心 API 深度集成，保持类型安全
- ✅ **易于使用**：API 简洁直观

#### 订阅 (Subscription)

支持 GraphQL Subscriptions，使用 async generator 实现实时数据推送。

**实现方式**：
```typescript
const subscriptionType = g.type('Subscription', {
  counter: g.int()
})

const resolvers = {
  Subscription: {
    counter: {
      subscribe: async function* (parent, args, context, info) {
        for (let i = 100; i >= 0; i--) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          yield { counter: i }
        }
      }
    }
  }
}
```

**文档参考**：[Subscriptions | Garph](https://garph.dev/docs/advanced/subscriptions.html)

- ✅ **原生支持**：使用 async generator 实现，符合现代 JavaScript 标准
- ✅ **类型安全**：完整的类型推导支持
- ⚠️ **传输协议**：依赖 GraphQL Server 的传输协议支持（如 Yoga 的 WebSocket）

#### 自定义标量 (Scalars)

支持定义自定义标量类型，内置常用标量支持。

**实现方式**：
```typescript
// garph/src/schema.ts (lines 8-12)
export const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})
```

- ✅ **易于定义**：通过 `g.scalarType()` 简洁定义
- ✅ **类型安全**：支持泛型类型参数
- ✅ **灵活**：可以集成第三方标量库（如 `graphql-scalars`）

#### 上下文 (Context)

支持在 Resolver 中注入上下文，并提供完整的类型推导能力。

**实现方式**：
```typescript
const resolvers: InferResolvers<
  { Query: typeof queryType }, 
  { context: YogaInitialContext & ReturnType<typeof context> }
> = {
  Query: {
    context: (parent, args, context, info) => `Context: ${context.hello}`
  }
}
```

**文档参考**：[Context | Garph](https://garph.dev/docs/advanced/context.html)

- ✅ **类型推导**：通过 TypeScript 泛型实现完整的上下文类型推导
- ✅ **易于扩展**：支持扩展默认上下文（如 YogaInitialContext）
- ✅ **类型安全**：编译时确保上下文类型正确

#### 联邦架构 (Federation)

**状态**：开发中（Work in progress）

**文档参考**：[Federation | Garph](https://garph.dev/docs/advanced/federation.html)

- ⚠️ **未完成**：当前版本不支持 GraphQL Federation
- ⚠️ **计划中**：功能正在开发中，参见 [GitHub Issue #26](https://github.com/stepci/garph/issues/26)

#### Directives 和 Extensions

- ❓ **Directives**：文档中未明确提及 GraphQL Directives 的支持情况
- ❓ **Extensions**：文档中未明确提及 GraphQL Extensions 的支持情况
- ❓ **查询复杂度**：未看到声明查询复杂度的相关文档

#### 中间件 (Middleware)

- ❓ **未明确支持**：文档中未看到 Resolver 中间件的相关文档
- ⚠️ **可能通过 Context 实现**：可以通过 Context 注入中间件逻辑，但缺乏官方中间件 API

#### 扩展机制

**状态**：开发中（Work in progress）

**文档参考**：[Extending Garph | Garph](https://garph.dev/docs/advanced/extending-garph.html)

- ⚠️ **未完成**：插件系统正在开发中，参见 [GitHub Issue #50](https://github.com/stepci/garph/issues/50)
- ⚠️ **缺乏插件系统**：当前版本缺乏灵活的插件系统来扩展功能

#### 总结

- ✅ **核心功能完整**：批量加载、订阅、自定义标量、上下文等核心功能都有良好支持
- ✅ **类型安全**：所有功能都与核心 API 深度集成，保持类型安全
- ⚠️ **部分功能缺失**：Federation、插件系统等高级功能仍在开发中
- ⚠️ **文档可改进**：Directives、Extensions、Middleware 等功能的支持情况需要更明确的文档说明

---

### 7. 生态集成

**评估结果：Server 兼容性优秀，验证库集成良好，ORM 集成待完善**

#### Server 兼容性

Garph 对主流 GraphQL Server 有良好的兼容性支持。

**支持的 Server**：
- ✅ **GraphQL Yoga**：官方推荐，文档示例主要使用 Yoga
- ✅ **Apollo Server**：支持集成
- ✅ **Mercurius**：支持集成（Fastify 的 GraphQL 适配器）

**文档参考**：[Integration - Server | Garph](https://garph.dev/docs/integration/server/)

**实现方式**：
```typescript
// garph/src/server.ts (lines 53-56)
export const schema = buildSchema({ g, resolvers })

const yoga = createYoga({ schema })
const server = createServer(yoga)
```

- ✅ **无服务器绑定**：Garph 本身不绑定特定服务器，可以自由选择
- ✅ **易于集成**：通过 `buildSchema()` 生成的 Schema 可以用于任何 GraphQL Server
- ✅ **文档完善**：提供了多个服务器的集成示例

#### 验证库集成

支持与 Zod 等验证库集成，但集成方式较为基础。

**实现方式**：
通过自定义标量类型集成 Zod 验证：

```typescript
import { z } from 'zod'
const usernameValidator = z.string().min(3)

const username = g.scalarType<string, string>('Username', {
  serialize: (username) => username,
  parseValue: (username) => {
    if (!usernameValidator.safeParse(username).success) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})
```

**文档参考**：[Validation | Garph](https://garph.dev/docs/advanced/validation.html)

- ✅ **支持 Zod**：可以通过自定义标量集成 Zod 验证
- ⚠️ **集成方式基础**：需要手动编写验证逻辑，缺乏深度集成
- ⚠️ **无自动类型推导**：无法直接从 Zod Schema 自动推导 GraphQL 类型
- ❓ **其他验证库**：未看到 Valibot、Yup 等验证库的集成示例

#### ORM 集成

- ❓ **未明确支持**：文档中未看到与 Prisma、Drizzle、TypeORM 等 ORM 的深度整合
- ⚠️ **缺乏官方插件**：未看到类似 Pothos Prisma 插件的官方 ORM 集成方案
- ⚠️ **需要手动集成**：可能需要手动编写 Resolver 来连接 ORM

#### Web 框架集成

- ✅ **Next.js**：文档中有 Next.js 集成示例
- ❓ **其他框架**：未明确看到 Hono、Fastify 等框架的集成文档

#### 客户端集成

- ✅ **GQty**：文档中提到与 GQty 客户端集成
- ❓ **其他客户端**：未明确看到 Apollo Client、urql 等客户端的集成文档

#### 总结

- ✅ **Server 兼容性优秀**：支持主流 GraphQL Server，无服务器绑定
- ✅ **验证库基础支持**：支持与 Zod 集成，但集成方式较为基础
- ⚠️ **ORM 集成待完善**：缺乏官方 ORM 集成方案，需要手动实现
- ⚠️ **生态可扩展**：虽然缺乏官方插件系统，但通过标准 GraphQL Schema 可以与其他工具集成

**参考链接**：
- [Garph 官网](https://garph.dev/)
- [Garph 文档](https://garph.dev/docs/)
- [Garph GitHub](https://github.com/stepci/garph)

