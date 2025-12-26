# GQLoom 评估报告

## 📋 基本信息

- **官网**: [https://gqloom.dev/](https://gqloom.dev/)
- **仓库地址**: [https://github.com/modevol-com/gqloom](https://github.com/modevol-com/gqloom)
- **首次 Release**: 2024-09-13 (v0.2.0)
- **最新 Release**: 2025-12-24 (v0.15.0)

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 6 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 1. 架构模式

**评估结果：Weaving（编织）模式**

GQLoom 采用典型的 **Weaving（编织）模式**，通过组合独立的 Resolver 和 Schema 定义来构建 GraphQL Schema。

#### 实现方式

- **Schema 定义**：使用验证库的 Schema（如 Zod、Valibot、Yup 等）定义类型，Schema 既是运行时验证逻辑，也是 GraphQL Schema 的来源
- **Resolver 定义**：通过 `resolver.of()` 和 `resolver()` 定义独立的 Resolver 模块
- **Schema 编织**：使用 `weave()` 函数配合 Weaver（如 `ZodWeaver`、`ValibotWeaver` 等）将多个 Resolver 组合成最终的 GraphQL Schema

**代码示例**：
```typescript
// gqloom/src/schema.ts (lines 1-17)
import * as z from 'zod'
import { GraphQLDateTime, GraphQLJSON, GraphQLJSONObject } from 'graphql-scalars'
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'
import { userResolver } from './resolvers/user.ts'
import { menuResolver } from './resolvers/menu.ts'
import { orderResolver } from './resolvers/order.ts'

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})

export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
```

#### 优势

- ✅ **无运行时反射**：不依赖反射元数据，运行时开销小
- ✅ **代码纯净**：纯函数式 API，易于测试和调试
- ✅ **模块化构建**：每个 Resolver 模块独立，支持大型项目的模块化组织
- ✅ **单一数据源**：验证库的 Schema 同时作为验证逻辑和 GraphQL Schema 的来源
- ✅ **类型安全**：通过 TypeScript 和验证库提供完整的类型安全

#### 劣势

- ⚠️ **需要选择 Weaver**：必须选择一个 Weaver（如 `ZodWeaver`、`ValibotWeaver`、`YupWeaver` 等）来将验证库的 Schema 转换为 GraphQL Schema，虽然支持多种验证库，但需要安装相应的 Weaver 包
- ⚠️ **编织步骤**：需要显式调用 `weave()` 进行构建，需要配置 Weaver

---

### 2. 依赖复杂度

**评估结果：依赖适中，需要选择一个 Weaver**

#### 核心依赖

- `@gqloom/core` - 核心库
- `@gqloom/zod` - Zod Weaver（用于将 Zod Schema 转换为 GraphQL Schema，示例使用）
- `graphql` - GraphQL 运行时
- `zod` - 验证库（示例使用，可以选择其他验证库如 Valibot、Yup 等）

#### 额外依赖

- `graphql-scalars` - 用于自定义标量类型（如 DateTime、JSON）
- `graphql-yoga` - GraphQL 服务器（仅用于示例，非必需）

#### 评估

- ⚠️ **需要选择 Weaver**：必须选择一个 Weaver（如 `@gqloom/zod`、`@gqloom/valibot`、`@gqloom/yup` 等）来将验证库的 Schema 转换为 GraphQL Schema，虽然支持多种验证库，但需要安装相应的 Weaver 包和验证库
- ✅ **无反射元数据**：不依赖反射元数据、类验证器等
- ⚠️ **依赖数量中等**：核心依赖 2 个（`@gqloom/core`、`graphql`），加上 Weaver 和验证库共 4 个
- ✅ **模块化设计**：核心库和 Weaver 分离，可以按需选择 Weaver 和验证库

**依赖清单**：
```json
// gqloom/package.json (lines 11-19)
  "dependencies": {
    "@coffee-shop/shared": "workspace:*",
    "@gqloom/core": "^0.15.0",
    "@gqloom/zod": "^0.15.0",
    "graphql": "^16.12.0",
    "graphql-scalars": "^1.25.0",
    "graphql-yoga": "^5.18.0",
    "zod": "^4.2.1"
  }
```

---

### 3. 类型定义

**评估结果：单一数据源，类型推断优秀**

#### 对象类型

使用验证库的 Schema（示例使用 Zod）定义对象类型，Schema 同时作为验证逻辑和 GraphQL Schema 的来源：

```typescript
// gqloom/src/resolvers/user.ts (lines 7-12)
export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),
})
```

- ✅ **单一数据源**：验证库的 Schema 同时提供运行时验证、TypeScript 类型和 GraphQL Schema
- ✅ **类型推断**：通过验证库的类型推断（如 `z.infer<typeof User>`）获取 TypeScript 类型

#### 联合类型 (Union)

支持 Union 类型定义，通过 `z.union()` 定义：

```typescript
// gqloom/src/resolvers/menu.ts (line 27)
export const MenuItem = z.union([Coffee, Dessert])
```

- ✅ **直观定义**：使用 `z.union()` 直观地定义 Union 类型
- ✅ **自动处理 `__typename`**：需要在 Schema 中手动设置 `__typename` 字段（如 `z.literal('Coffee')`）
- ✅ **支持内联片段**：完全支持 GraphQL 内联片段查询

#### 接口 (Interface)

支持 Interface 定义和实现，通过 `.register()` 方法实现接口：

```typescript
// gqloom/src/resolvers/menu.ts (lines 7-12)
export const Food = z.object({
  __typename: z.literal('Food').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// gqloom/src/resolvers/menu.ts (lines 16-20)
export const Coffee = Food.extend({
  __typename: z.literal('Coffee'),
  sugarLevel: SugarLevel,
  origin: z.string(),
}).register(asObjectType, { interfaces: [Food] })
```

- ✅ **直观的实现方式**：通过 `.register(asObjectType, { interfaces: [Food] })` 实现接口
- ✅ **自动继承公共字段**：接口字段自动继承，无需重复定义
- ⚠️ **需要手动注册**：需要使用 `.register()` 方法显式注册接口关系

#### 枚举类型 (Enum)

直接使用 `z.enum()` 定义枚举，无需手动注册：

```typescript
// gqloom/src/resolvers/menu.ts (line 14)
const SugarLevel = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])

// gqloom/src/resolvers/order.ts (line 8)
export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])
```

- ✅ **直接映射**：支持直接使用字符串数组定义枚举
- ✅ **类型安全**：TypeScript 类型与 GraphQL 枚举自动同步
- ✅ **无需重复定义**：一份定义同时生成验证逻辑和 GraphQL 枚举

#### 类型推断

支持从验证库的 Schema 推断 TypeScript 类型：

```typescript
// gqloom/src/resolvers/user.ts (line 14)
export const userMap = new Map<number, z.infer<typeof User>>(USERS.map((u) => [u.id, u]))
```

- ✅ **单一数据源**：验证库的 Schema 是单一数据源，可以同时生成 GraphQL Schema 和 TypeScript 类型
- ✅ **类型同步**：杜绝类型不同步问题
- ✅ **自动推断**：通过验证库的类型推断（如 `z.infer<typeof Type>`）自动推断类型

---

### 4. 解析器定义与输入验证

**评估结果：类型安全，验证能力强大**

解析器（Resolver）是业务逻辑的核心所在。优秀的解析器定义应当能够自动推断输入参数类型、提供强类型的返回值校验，并能优雅地集成验证逻辑。

#### 类型安全的 Resolver

使用 `resolver.of()` 和 `resolver()` 定义 Resolver，类型自动从验证库的 Schema 推断：

```typescript
// gqloom/src/resolvers/user.ts (lines 16-26)
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order))).load((users) => {
    const userOrders = new Map<number, z.infer<typeof Order>[]>()
    for (const order of orderMap.values()) {
      const orders = userOrders.get(order.userId) ?? []
      orders.push(order)
      userOrders.set(order.userId, orders)
    }
    return users.map((user) => userOrders.get(user.id) ?? [])
  }),

  users: query(z.array(User), () => Array.from(userMap.values())),
```

- ✅ **完整类型推导**：从验证库的 Schema 自动推断参数和返回值类型
- ✅ **编译时检查**：类型不匹配会在编译时报错

#### 模块化组织

支持将 Schema 定义和 Resolver 按领域模块化组织：

```typescript
// gqloom/src/resolvers/user.ts
export const userResolver = resolver.of(User, {
  // Query 和 Mutation 定义
})

// gqloom/src/resolvers/menu.ts
export const menuResolver = resolver({
  // Query 和 Mutation 定义
})

// gqloom/src/resolvers/order.ts
export const orderResolver = resolver.of(Order, {
  // Query 和 Mutation 定义
})
```

- ✅ **高内聚**：每个模块（user、menu、order）包含完整的 Schema 定义、Query、Mutation 和关联 Resolver
- ✅ **易于维护**：业务逻辑与 Schema 定义紧密集成，都在同一个文件中
- ✅ **支持 DDD**：适合领域驱动开发的组织方式

#### Query 和 Mutation 定义

使用 `query()` 和 `mutation()` 函数定义操作：

```typescript
// gqloom/src/resolvers/user.ts (lines 27-35)
  users: query(z.array(User), () => Array.from(userMap.values())),

  user: query(User)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    }),

  createUser: mutation(User)
    .input({
      name: z.string(),
      email: z.email(),
    })
    .resolve(({ name, email }) => {
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    }),
```

- ✅ **链式 API**：使用链式调用定义 Query 和 Mutation
- ✅ **类型安全**：输入和输出类型自动从验证库的 Schema 推断
- ✅ **代码简洁**：API 设计简洁直观

#### Schema 编织

在 `schema.ts` 中统一编织所有模块：

```typescript
// gqloom/src/schema.ts (line 17)
export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
```

- ✅ **简单组装**：通过 `weave()` 函数简单地将所有 Resolver 组合
- ✅ **配置集中**：Weaver 配置集中管理

#### 参数定义

使用 `.input()` 方法定义参数，支持链式调用：

```typescript
// gqloom/src/resolvers/user.ts (lines 29-35)
  user: query(User)
    .input({ id: z.int() })
    .resolve(({ id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    }),
```

```typescript
// gqloom/src/resolvers/user.ts (lines 49-61)
  updateUser: mutation(User)
    .input({
      id: z.int(),
      name: z.string().nullish(),
      email: z.email().nullish(),
    })
    .resolve(({ id, name, email }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      if (name != null) user.name = name
      if (email != null) user.email = email
      return user
    }),
```

- ✅ **链式调用**：符合 TypeScript 直觉的链式 API
- ✅ **完整类型推导**：参数类型自动从验证库的 Schema 推断，提供完整的 IDE 提示
- ✅ **可选参数**：通过验证库的方法（如 Zod 的 `.nullish()`）支持可选参数

#### 格式验证

格式验证直接使用验证库的内置验证功能（示例使用 Zod）：

```typescript
// gqloom/src/resolvers/user.ts (lines 7-12)
export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),  // 自动验证邮箱格式
})
```

```typescript
// gqloom/src/resolvers/user.ts (lines 37-47)
  createUser: mutation(User)
    .input({
      name: z.string(),
      email: z.email(),  // 自动验证邮箱格式
    })
    .resolve(({ name, email }) => {
      // 验证已在 Schema 定义阶段完成
      const id = incrementId()
      const newUser = { id, name, email }
      userMap.set(id, newUser)
      return newUser
    }),
```

- ✅ **声明式验证**：验证逻辑在 Schema 定义阶段完成，无需在 Resolver 中手动验证
- ✅ **内置验证**：支持验证库的所有内置验证（如 Zod 的 `.email()`, `.min()`, `.max()` 等）
- ✅ **类型定义与验证结合**：验证逻辑与类型定义紧密结合

#### 自定义验证

支持使用验证库的自定义验证方法（示例使用 Zod 的 `.refine()`）进行自定义业务逻辑验证：

```typescript
// gqloom/src/resolvers/order.ts (lines 38-56)
  createOrder: mutation(Order)
    .input({
      userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
      items: z
        .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
        .min(1, 'At least one item is required'),
    })
    .resolve(({ userId, items }) => {
      // 验证已在 Schema 定义阶段完成，这里直接使用已验证的数据
      const id = incrementId()
      const newOrder = {
        id,
        userId,
        itemIds: items,
        status: 'PENDING' as const,
        createdAt: new Date(),
      }
      orderMap.set(id, newOrder)
      return newOrder
    }),
```

- ✅ **声明式验证**：在 Schema 定义阶段注入自定义验证函数
- ✅ **易于复用**：验证逻辑可以提取为独立的 Schema 并复用
- ✅ **可组合**：支持链式调用多个验证规则（如 `.min()` + `.refine()`）
- ✅ **可维护性高**：验证逻辑集中在 Schema 定义中，Resolver 代码更简洁

#### 总结

- ✅ **参数定义优秀**：链式 API 清晰，类型推导完整
- ✅ **验证能力强大**：充分利用验证库的验证能力，支持声明式验证
- ✅ **单一数据源**：验证逻辑、类型定义和 GraphQL Schema 都来自同一个验证库的 Schema
- ✅ **最佳实践**：符合现代 GraphQL 开发的最佳实践

---

### 5. 内置功能

**评估结果：功能完整，开箱即用**

#### 批量加载 (Batching)

GQLoom 原生支持 DataLoader 模式，通过 `.load()` 方法优雅地解决 N+1 查询问题。

**实现方式**：
```typescript
// gqloom/src/resolvers/user.ts (lines 16-25)
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order))).load((users) => {
    const userOrders = new Map<number, z.infer<typeof Order>[]>()
    for (const order of orderMap.values()) {
      const orders = userOrders.get(order.userId) ?? []
      orders.push(order)
      userOrders.set(order.userId, orders)
    }
    return users.map((user) => userOrders.get(user.id) ?? [])
  }),
```

**文档参考**：[DataLoader | GQLoom](https://gqloom.dev/docs/dataloader.html)

- ✅ **原生支持**：内置批量加载机制，通过 `.load()` 方法实现
- ✅ **类型安全**：与核心 API 深度集成，保持类型安全
- ✅ **易于使用**：API 简洁直观，自动批量处理多个查询请求

#### 订阅 (Subscription)

支持 GraphQL Subscriptions，使用 async generator 或 publish/subscribe 模式实现实时数据推送。

**文档参考**：[Subscription | GQLoom](https://gqloom.dev/docs/advanced/subscription.html)

- ✅ **原生支持**：使用 async generator 实现，符合现代 JavaScript 标准
- ✅ **支持 publish/subscribe**：可以与 GraphQL Yoga 的 PubSub 集成
- ✅ **类型安全**：完整的类型推导支持
- ⚠️ **传输协议**：依赖 GraphQL Server 的传输协议支持（如 Yoga 的 WebSocket）

#### 上下文 (Context)

支持在 Resolver 中注入上下文，使用 `useContext()` 函数，基于 Node.js 的 AsyncLocalStorage 实现。

**实现方式**：
```typescript
import { useContext } from "@gqloom/core/context"
import { asyncContextProvider } from "@gqloom/core/context"

// 启用上下文
const schema = weave(ZodWeaver, asyncContextProvider, ...resolvers)

// 在 Resolver 中使用
const helloResolver = resolver({
  hello: query(z.string(), () => {
    const user = useContext<YogaInitialContext>().request.headers.get("Authorization")
    return `Hello, ${user ?? "World"}`
  }),
})
```

**文档参考**：[Context | GQLoom](https://gqloom.dev/docs/context.html)

- ✅ **类型推导**：通过 TypeScript 泛型实现完整的上下文类型推导
- ✅ **易于使用**：使用 `useContext()` 函数，类似 React 的 `useContext`
- ✅ **类型安全**：编译时确保上下文类型正确
- ✅ **支持中间件**：可以在中间件中访问上下文
- ⚠️ **环境限制**：对于不支持 AsyncLocalStorage 的环境（如浏览器、Cloudflare Workers），需要使用 `context` 属性

#### 中间件 (Middleware)

支持在 Resolver 执行前后注入中间件逻辑，采用面向切面编程（AOP）的概念。

**文档参考**：[Middleware | GQLoom](https://gqloom.dev/docs/middleware.html)

**实现方式**：
```typescript
import { Middleware } from "@gqloom/core"
import { useContext } from "@gqloom/core/context"

function useUser() {
  const user = useContext<YogaInitialContext>().request.headers.get("Authorization")
  return user
}

const authGuard: Middleware = (next) => {
  const user = useUser()
  if (!user) throw new Error("Please login first")
  return next()
}
```

- ✅ **原生支持**：提供完整的中间件 API
- ✅ **面向切面编程**：支持在解析过程中无缝集成额外逻辑（错误处理、权限验证、日志跟踪等）
- ✅ **类型安全**：与核心 API 深度集成，保持类型安全
- ✅ **可组合**：支持组合多个中间件

#### 自定义标量 (Scalars)

支持定义自定义标量类型，通过 Weaver 配置预设 GraphQL 类型。

**实现方式**：
```typescript
// gqloom/src/schema.ts (lines 9-15)
export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})
```

**文档参考**：[Customize Type Mappings | GQLoom](https://gqloom.dev/docs/schema/customize-type-mappings.html)

- ✅ **易于定义**：通过 Weaver 配置预设 GraphQL 类型
- ✅ **灵活**：可以集成第三方标量库（如 `graphql-scalars`）
- ✅ **类型安全**：支持泛型类型参数
- ✅ **默认映射**：提供丰富的默认类型映射（如 `z.string().uuid()` → `GraphQLID`）

#### 联邦架构 (Federation)

支持 GraphQL Federation，提供专门的包 `@gqloom/federation`。

**文档参考**：[Federation | GQLoom](https://gqloom.dev/docs/advanced/federation.html)

**实现方式**：
- 支持在对象和字段上声明 GraphQL Directives
- 提供 `resolveReference` 函数帮助解析引用
- 使用 `FederatedSchemaLoom.weave()` 编织联邦 Schema

- ✅ **完整支持**：提供完整的 Federation 支持
- ✅ **Directives 支持**：支持在 Schema 和 Resolver 中声明 Directives
- ✅ **类型安全**：与核心 API 深度集成

#### Directives 和 Extensions

- ✅ **Directives**：完整支持 GraphQL Directives 的定义和使用，特别是在 Federation 场景中
- ❓ **Extensions**：文档中未明确提及 GraphQL Extensions 的支持情况
- ❓ **查询复杂度**：未看到声明查询复杂度的相关文档

#### 文件上传 (Upload)

支持文件上传功能。

**文档参考**：[Upload | GQLoom](https://gqloom.dev/docs/advanced/upload.html)

- ✅ **原生支持**：提供文件上传功能

#### 总结

- ✅ **功能完整**：批量加载、订阅、自定义标量、上下文、中间件、Federation、文件上传等核心功能都有完整支持
- ✅ **类型安全**：所有功能都与核心 API 深度集成，保持类型安全
- ✅ **开箱即用**：功能齐全，减少样板代码
- ✅ **文档完善**：每个功能都有详细的文档说明
- ✅ **现代化设计**：使用 AsyncLocalStorage、async generator 等现代 JavaScript 特性

---

### 6. 生态集成

**评估结果：生态集成优秀，支持多种验证库和 ORM**

#### 验证库集成

GQLoom 的核心优势在于支持多种验证库，通过不同的 Weaver 实现无缝集成。

**支持的验证库**：
- ✅ **Zod**：`@gqloom/zod` - 官方支持，文档示例主要使用 Zod
- ✅ **Valibot**：`@gqloom/valibot` - 官方支持
- ✅ **Yup**：`@gqloom/yup` - 官方支持
- ✅ **Effect**：`@gqloom/effect` - 官方支持
- ✅ **JSON Schema**：`@gqloom/json` - 官方支持

**文档参考**：[Schema Integration | GQLoom](https://gqloom.dev/docs/schema/)

**实现方式**：
```typescript
// gqloom/src/schema.ts (lines 1-17)
import * as z from 'zod'
import { weave } from '@gqloom/core'
import { ZodWeaver } from '@gqloom/zod'

export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})

export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
```

- ✅ **深度集成**：验证库的 Schema 直接作为 GraphQL Schema 的来源
- ✅ **单一数据源**：验证逻辑、类型定义和 GraphQL Schema 都来自同一个 Schema 定义
- ✅ **灵活选择**：可以根据项目需求选择最熟悉的验证库
- ✅ **无缝链接**：实现从字段验证到类型推导的无缝链接

#### ORM 集成

GQLoom 提供 ResolverFactory，可以快速为 ORM 模型生成 CRUD 接口。

**支持的 ORM**：
- ✅ **Prisma**：`@gqloom/prisma` - 官方支持，提供 ResolverFactory
- ✅ **MikroORM**：`@gqloom/mikro-orm` - 官方支持，提供 ResolverFactory
- ✅ **Drizzle**：`@gqloom/drizzle` - 官方支持，提供 ResolverFactory

**文档参考**：
- [Prisma | GQLoom](https://gqloom.dev/docs/schema/prisma.html)
- [MikroORM | GQLoom](https://gqloom.dev/docs/schema/mikro-orm.html)
- [Drizzle | GQLoom](https://gqloom.dev/docs/schema/drizzle.html)

**实现方式**：
```typescript
import { MikroResolverFactory } from '@gqloom/mikro-orm'
import { User, Post } from 'src/entities'

const userResolver = new MikroResolverFactory(User, useEm).resolver()
const postResolver = new MikroResolverFactory(Post, useEm).resolver()

const schema = weave(userResolver, postResolver)
```

**功能特点**：
- ✅ **深度整合**：直接复用数据库模型定义，无需重新定义 GraphQL 类型
- ✅ **快速生成**：使用 ResolverFactory 在几分钟内构建完整的 GraphQL 接口
- ✅ **功能完整**：支持关联查询、创建、删除和更新操作
- ✅ **易于扩展**：可以自由修改输入或输出类型，添加自定义中间件和逻辑
- ✅ **无缝集成**：与验证库无缝集成，使用熟悉的验证库验证输入数据

#### Server 兼容性

GQLoom 对主流 GraphQL Server 有良好的兼容性支持。

**支持的 Server**：
- ✅ **GraphQL Yoga**：官方推荐，文档示例主要使用 Yoga
- ✅ **Apollo Server**：支持集成（通过标准 GraphQL Schema）
- ✅ **Mercurius**：支持集成（Fastify 的 GraphQL 适配器）

**文档参考**：[Adapters | GQLoom](https://gqloom.dev/docs/advanced/adapters.html)

**实现方式**：
```typescript
// gqloom/src/server.ts (lines 1-12)
import { createYoga } from 'graphql-yoga'
import { createServer } from 'node:http'
import { schema } from './schema.ts'

const yoga = createYoga({ schema })
const server = createServer(yoga)

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
```

**Apollo Server 集成**：
```typescript
import { weave } from "@gqloom/core"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"

const schema = weave(helloResolver)
const server = new ApolloServer({ schema })

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.info(`🚀  Server ready at: ${url}`)
})
```

- ✅ **无服务器绑定**：GQLoom 本身不绑定特定服务器，可以自由选择
- ✅ **易于集成**：通过 `weave()` 生成的 Schema 可以用于任何 GraphQL Server
- ✅ **标准兼容**：生成的 Schema 符合 GraphQL 标准，兼容所有标准 GraphQL Server
- ✅ **文档完善**：提供了多个服务器的集成示例

#### Web 框架集成

GQLoom 对主流 Web 框架有良好的兼容性支持。

**支持的 Web 框架**：
- ✅ **Hono**：官方支持，提供适配器文档
- ✅ **Elysia**：官方支持，提供适配器文档（Bun 的 Web 框架）
- ✅ **Fastify**：通过 Mercurius 适配器支持

**文档参考**：[Adapters | GQLoom](https://gqloom.dev/docs/advanced/adapters.html)

- ✅ **官方支持**：Hono 和 Elysia 有官方适配器文档
- ✅ **标准兼容**：由于使用标准 GraphQL Schema，可以与任何支持 GraphQL 的 Web 框架集成
- ❓ **Next.js**：文档中未明确看到 Next.js 的集成文档，但可以通过标准 GraphQL Schema 集成

#### 总结

- ✅ **验证库集成优秀**：支持 5 种主流验证库（Zod、Valibot、Yup、Effect、JSON Schema），深度集成，单一数据源
- ✅ **ORM 集成优秀**：支持 3 种主流 ORM（Prisma、MikroORM、Drizzle），提供 ResolverFactory 快速生成 CRUD 接口
- ✅ **Server 兼容性良好**：支持主流 GraphQL Server（Yoga、Apollo Server、Mercurius），无服务器绑定
- ✅ **Web 框架支持**：官方支持 Hono、Elysia，通过 Mercurius 支持 Fastify
- ✅ **消除胶水代码**：通过 Weaver 和 ResolverFactory 显著减少重复代码
- ✅ **端到端类型安全**：从数据库模型到 GraphQL Schema 的完整类型安全链路

**参考链接**：
- [GQLoom 官网](https://gqloom.dev/)
- [GQLoom 文档](https://gqloom.dev/docs/)
- [GQLoom GitHub](https://github.com/modevol-com/gqloom)


