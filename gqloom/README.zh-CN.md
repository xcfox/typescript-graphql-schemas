# GQLoom 评估报告

本报告基于对 GQLoom 源码和实际业务代码的深入调研，从 5 个核心技术维度进行全面评估。

## 1. 架构模式

### 1.1 核心架构

GQLoom 采用 **Weaving（编织）模式**，通过 `weave` 函数将独立的 Resolver 和 Schema 定义组合成完整的 GraphQL Schema。

核心构建流程：

```ts
// 从业务代码示例
export const schema = weave(
  ZodWeaver,           // Schema Weaver（类型转换器）
  zodWeaverConfig,     // Weaver 配置
  userResolver,        // Resolver 1
  menuResolver,        // Resolver 2
  orderResolver        // Resolver 3
)
```

### 1.2 Schema 构建机制

从源码 `packages/core/src/schema/schema-loom.ts` 可以看到：

1. **Weaver 系统**：通过 `SchemaWeaver` 接口实现类型转换
   - `getGraphQLType`: 将验证库 Schema（如 Zod）转换为 GraphQL 类型
   - `getGraphQLArgumentConfig`: 处理输入参数配置

2. **Resolver 组合**：通过 `GraphQLSchemaLoom` 类管理：
   - 自动识别 Query、Mutation、Subscription 操作
   - 支持对象类型的 Field Resolver（通过 `resolver.of()`）
   - 支持全局和局部中间件

3. **运行时构建**：`weaveGraphQLSchema()` 方法在运行时构建 GraphQL Schema，无需编译时处理

### 1.3 依赖复杂度

**核心依赖（@gqloom/core）**：
- `graphql`: >= 16.8.0（peer dependency）
- `@standard-schema/spec`: 1.1.0（开发依赖，用于类型规范）

**业务代码依赖**：
- `@gqloom/core`: ^0.15.0
- `@gqloom/zod`: ^0.15.0（可选，用于 Zod 集成）
- `zod`: ^4.2.1（可选，验证库）
- `graphql-scalars`: ^1.25.0（可选，自定义标量）
- `graphql-yoga`: ^5.18.0（可选，GraphQL Server）

**评估**：
- ✅ **依赖极轻量**：核心库仅依赖 GraphQL，无运行时元数据反射需求
- ✅ **安装即用**：无需配置 TypeScript 编译选项、无需代码生成、无需编译时插件
- ✅ **模块化设计**：验证库集成（Zod、Valibot、Yup、Effect）通过独立包提供，按需引入
- ✅ **无全局副作用**：不依赖 `reflect-metadata` 等全局注入

### 1.4 构建过程

**优点**：
- ✅ 纯运行时构建，无需构建步骤
- ✅ 支持模块化组织，每个领域模块可独立定义 Resolver
- ✅ 通过 `weave` 函数灵活组合，支持大型项目拆分

**代码示例**：
```ts
// 模块化组织
export const userResolver = resolver.of(User, { ... })
export const menuResolver = resolver({ ... })
export const orderResolver = resolver.of(Order, { ... })

// 统一编织
export const schema = weave(ZodWeaver, zodWeaverConfig, 
  userResolver, menuResolver, orderResolver)
```

### 1.5 架构模式总结

| 特性       | 评估                         |
| ---------- | ---------------------------- |
| 架构模式   | Weaving（编织）模式          |
| 依赖复杂度 | ⭐⭐⭐⭐⭐ 极低（仅 GraphQL）     |
| 构建过程   | ⭐⭐⭐⭐⭐ 零配置，运行时构建     |
| 模块化支持 | ⭐⭐⭐⭐⭐ 优秀，支持领域驱动开发 |
| 全局副作用 | ⭐⭐⭐⭐⭐ 无全局副作用           |

**总体评价**：GQLoom 的架构模式非常现代化，依赖极轻量，实现了"安装即用"的目标。Weaving 模式使得代码组织清晰，支持大型项目的模块化开发。

---

## 2. 类型定义

### 2.1 对象类型（ObjectType）

GQLoom 使用 **Zod Schema** 作为单一数据源定义对象类型，实现了类型定义、运行时验证和 GraphQL Schema 的完全统一。

**定义方式**：
```ts
// 业务代码示例
export const User = z.object({
  __typename: z.literal('User').nullish(),
  id: z.int(),
  name: z.string(),
  email: z.email(),
})
```

**特点**：
- ✅ **单一数据源**：一份 Zod Schema 同时提供 TypeScript 类型、运行时验证和 GraphQL Schema
- ✅ **自动类型推断**：通过 `z.infer<typeof User>` 获得 TypeScript 类型
- ✅ **自动命名**：通过 `__typename` 字面量自动推断 GraphQL 类型名称，也支持手动配置

**源码实现**（`packages/zod/src/utils.ts`）：
- 自动从 `__typename` 字面量提取类型名称
- 支持通过 `asObjectType` registry 手动配置名称和接口

### 2.2 接口（Interface）

GQLoom 通过 `.register(asObjectType, { interfaces: [...] })` 方式实现接口。

**定义方式**：
```ts
// 定义接口
export const Food = z.object({
  __typename: z.literal('Food').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// 实现接口
export const Coffee = Food.extend({
  __typename: z.literal('Coffee'),
  sugarLevel: SugarLevel,
  origin: z.string(),
}).register(asObjectType, { interfaces: [Food] })

export const Dessert = Food.extend({
  __typename: z.literal('Dessert'),
  calories: z.number(),
}).register(asObjectType, { interfaces: [Food] })
```

**特点**：
- ✅ **继承机制**：使用 Zod 的 `.extend()` 方法实现字段继承
- ✅ **显式注册**：通过 `.register()` 方法显式声明接口实现关系
- ✅ **自动转换**：接口类型自动从 ObjectType 转换为 InterfaceType（`packages/core/src/schema/interface.ts`）

**源码实现**：
- `ZodWeaver.ensureInterfaceType()` 将 ObjectType 转换为 InterfaceType
- 接口的公共字段自动从实现类型中提取

### 2.3 联合类型（Union）

GQLoom 使用 `z.union([...])` 定义联合类型，支持自动 `__typename` 决议。

**定义方式**：
```ts
export const MenuItem = z.union([Coffee, Dessert])
```

**Discriminated Union 支持**：
- ✅ **自动识别**：当 Union 成员包含 `__typename` 字面量时，自动识别为 Discriminated Union
- ✅ **自动 resolveType**：通过 `resolveTypeByDiscriminatedUnion()` 函数自动实现类型决议

**源码实现**（`packages/zod/src/utils.ts`）：
```ts
if (isZodUnion(schema)) {
  return new GraphQLUnionType({
    resolveType: isZodDiscriminatedUnion(schema)
      ? resolveTypeByDiscriminatedUnion(schema)
      : undefined,
    types,
    name,
    ...unionConfig,
  })
}
```

**业务代码中的使用**：
- Union 类型在 Resolver 中需要手动检查 `__typename` 进行类型区分
- 返回数据必须包含 `__typename` 字段

### 2.4 枚举类型（Enum）

GQLoom 直接使用 `z.enum([...])` 定义枚举，无需额外注册步骤。

**定义方式**：
```ts
const SugarLevel = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])
export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])
```

**特点**：
- ✅ **零配置**：直接使用 TypeScript 字符串数组，无需 `registerEnumType`
- ✅ **自动映射**：Zod Enum 自动映射为 GraphQL EnumType
- ✅ **类型安全**：TypeScript 类型自动推断

**源码实现**（`packages/zod/src/index.ts`）：
- 自动从 Enum 定义提取名称和值
- 支持通过 `asEnumType` registry 配置枚举元数据

### 2.5 类型名称管理

**自动命名机制**：
1. **从 `__typename` 提取**：如果对象包含 `__typename: z.literal('TypeName')`，自动使用该名称
2. **从变量名推断**：通过 `weaverContext.names` 管理类型名称映射
3. **手动配置**：通过 `.register(asObjectType, { name: 'CustomName' })` 手动指定

**示例**：
```ts
// 方式1：通过 __typename
const User = z.object({
  __typename: z.literal('User'),  // 自动命名为 "User"
  // ...
})

// 方式2：手动配置
const User = z.object({...})
  .register(asObjectType, { name: 'CustomUser' })
```

### 2.6 类型定义总结

| 特性            | 评估                                 |
| --------------- | ------------------------------------ |
| 单一数据源      | ⭐⭐⭐⭐⭐ 完全统一（Zod Schema）         |
| ObjectType 定义 | ⭐⭐⭐⭐⭐ 直观，使用 Zod Object          |
| Interface 支持  | ⭐⭐⭐⭐ 良好，需显式注册                |
| Union 支持      | ⭐⭐⭐⭐⭐ 优秀，支持 Discriminated Union |
| Enum 支持       | ⭐⭐⭐⭐⭐ 零配置，直接使用 z.enum        |
| 类型推断        | ⭐⭐⭐⭐⭐ 完整的 TypeScript 类型推断     |

**优点**：
- ✅ 单一数据源，杜绝类型不同步问题
- ✅ 零配置枚举，直接复用 TypeScript 枚举定义
- ✅ 自动 Discriminated Union 支持
- ✅ 完整的类型安全

**缺点**：
- ⚠️ Interface 需要显式注册，不如直接继承直观
- ⚠️ Union 类型在 Resolver 中需要手动类型区分（这是 GraphQL 的通用限制）

**总体评价**：GQLoom 的类型定义系统非常现代化，通过 Zod Schema 实现了真正的单一数据源。枚举和联合类型的支持非常优秀，接口实现虽然需要显式注册，但整体体验良好。

---

## 3. 解析器定义与输入验证

### 3.1 解析器定义方式

GQLoom 提供了灵活的链式 API 来定义 Query、Mutation 和 Field Resolver。

#### 3.1.1 Query 和 Mutation

**定义方式**：
```ts
// Query - 无参数
users: query(z.array(User), () => Array.from(userMap.values()))

// Query - 带参数
user: query(User)
  .input({ id: z.int() })
  .resolve(({ id }) => {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    return user
  })

// Mutation
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
  })
```

**特点**：
- ✅ **链式 API**：`.input().resolve()` 链式调用，符合 TypeScript 直觉
- ✅ **类型推导**：输入参数类型自动从 Zod Schema 推断
- ✅ **可选输入**：可以不定义 `.input()`，直接使用 `.resolve()`

#### 3.1.2 Field Resolver

**定义方式**：
```ts
// 对象类型的 Field Resolver
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order)))
    .load((users) => {
      // 批量加载逻辑
      const userOrders = new Map<number, z.infer<typeof Order>[]>()
      for (const order of orderMap.values()) {
        const orders = userOrders.get(order.userId) ?? []
        orders.push(order)
        userOrders.set(order.userId, orders)
      }
      return users.map((user) => userOrders.get(user.id) ?? [])
    }),
})

// 普通 Field Resolver
export const orderResolver = resolver.of(Order, {
  user: field(z.lazy(() => User).nullish())
    .resolve((order) => userMap.get(order.userId)),
})
```

**特点**：
- ✅ **对象类型绑定**：通过 `resolver.of(ParentType, { ... })` 绑定到对象类型
- ✅ **批量加载支持**：`.load()` 方法自动实现 DataLoader 模式的批量加载
- ✅ **循环引用处理**：使用 `z.lazy()` 处理类型循环引用

#### 3.1.3 Resolver 组织

**模块化组织**：
```ts
// 每个领域模块独立定义 Resolver
export const userResolver = resolver.of(User, { ... })
export const menuResolver = resolver({ ... })
export const orderResolver = resolver.of(Order, { ... })

// 统一编织
export const schema = weave(ZodWeaver, zodWeaverConfig, 
  userResolver, menuResolver, orderResolver)
```

**特点**：
- ✅ **高内聚**：每个领域模块包含完整的类型定义和 Resolver
- ✅ **低耦合**：通过 `weave` 函数组合，支持领域驱动开发（DDD）
- ✅ **灵活组合**：支持全局中间件、配置等

### 3.2 输入参数定义

#### 3.2.1 参数类型推导

**自动类型推导**：
```ts
.input({
  id: z.int(),
  name: z.string().nullish(),
  email: z.email().nullish(),
})
.resolve(({ id, name, email }) => {
  // TypeScript 自动推断类型：
  // id: number
  // name: string | null | undefined
  // email: string | null | undefined
})
```

**源码实现**（`packages/core/src/resolver/input.ts`）：
- 通过 `InferInputI` 类型从 Zod Schema 自动推断输入类型
- 支持单个 Schema 或 Record 形式的参数定义
- 自动处理可选参数（`.nullish()`, `.optional()`）

#### 3.2.2 输入验证

**验证机制**：
- ✅ **自动验证**：Zod Schema 自动进行格式验证（如 `z.email()`）
- ✅ **自定义验证**：通过 `.refine()` 方法实现业务逻辑验证
- ✅ **错误处理**：验证失败自动抛出 `GraphQLError`，包含详细的错误信息

**业务代码示例**：
```ts
createOrder: mutation(Order)
  .input({
    userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
    items: z
      .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
      .min(1, 'At least one item is required'),
  })
  .resolve(({ userId, items }) => {
    // 验证已在输入阶段完成，Resolver 中无需再次验证
    // ...
  })
```

**源码实现**（`packages/core/src/resolver/input.ts`）：
- `createInputParser()` 创建输入解析器
- `parseInputValue()` 调用 Zod Schema 的 `validate()` 方法
- `getStandardValue()` 处理验证结果，失败时抛出 `GraphQLError`

### 3.3 批量加载（Batching）

GQLoom 内置了 DataLoader 模式的批量加载支持。

**使用方式**：
```ts
orders: field(z.array(z.lazy(() => Order)))
  .load((users) => {
    // users 是数组，自动批量处理
    const userOrders = new Map<number, z.infer<typeof Order>[]>()
    for (const order of orderMap.values()) {
      const orders = userOrders.get(order.userId) ?? []
      orders.push(order)
      userOrders.set(order.userId, orders)
    }
    return users.map((user) => userOrders.get(user.id) ?? [])
  })
```

**特点**：
- ✅ **自动批处理**：`.load()` 方法自动收集同一 tick 内的请求并批量处理
- ✅ **路径感知**：支持基于 GraphQL 查询路径的缓存（`FieldLoader.getByPath()`）
- ✅ **内置实现**：无需引入外部 DataLoader 库，使用内置的 `LoomDataLoader`

**源码实现**（`packages/core/src/utils/loader.ts`）：
- `LoomDataLoader` 抽象类实现批量加载逻辑
- `FieldLoader` 专门用于 Field Resolver 的批量加载
- 支持基于查询路径的缓存策略

### 3.4 解析器定义与输入验证总结

| 特性       | 评估                             |
| ---------- | -------------------------------- |
| 解析器定义 | ⭐⭐⭐⭐⭐ 链式 API，直观易用         |
| 类型推导   | ⭐⭐⭐⭐⭐ 完整的 TypeScript 类型推导 |
| 输入验证   | ⭐⭐⭐⭐⭐ 自动验证 + 自定义验证      |
| 批量加载   | ⭐⭐⭐⭐⭐ 内置 DataLoader 支持       |
| 模块化组织 | ⭐⭐⭐⭐⭐ 优秀的领域驱动开发支持     |
| 错误处理   | ⭐⭐⭐⭐⭐ 自动 GraphQLError 处理     |

**优点**：
- ✅ 链式 API 符合 TypeScript 开发习惯
- ✅ 完整的类型推导，IDE 支持优秀
- ✅ 验证逻辑与 Schema 定义合一，减少样板代码
- ✅ 内置批量加载，解决 N+1 问题
- ✅ 支持模块化组织，适合大型项目

**缺点**：
- ⚠️ 批量加载需要手动实现批量逻辑（这是通用限制，不是框架问题）

**总体评价**：GQLoom 的解析器定义系统非常优秀，链式 API 直观易用，类型推导完整，验证机制强大。内置的批量加载支持是很大的亮点，显著减少了样板代码。

---

## 4. 内置功能

### 4.1 Directives（指令）

**支持情况**：
- ✅ **Extensions 配置支持**：通过 `extensions.directives` 在对象类型、字段、输入对象等位置配置 Directives
- ✅ **Federation Directives**：通过 `@gqloom/federation` 包完整支持 Federation 指令（`@key`, `@shareable`, `@extends`, `@external`, `@link`）
- ✅ **链式 API**：Federation 包提供 `.directives()` 链式方法，方便配置
- ✅ **标准 Directives**：支持 GraphQL 标准指令 `@include`、`@skip`（自动处理）和 `@deprecated`（通过 `deprecationReason`）

**使用方式**：

**1. 通过 Extensions 配置**：
```ts
const User = new GraphQLObjectType({
  name: "User",
  fields: { ... },
  extensions: {
    directives: { 
      key: { fields: "id", resolvable: true } 
    }
  }
})
```

**2. Federation 链式 API**：
```ts
resolver.of(User, { ... })
  .directives({ key: { fields: "id", resolvable: true } })
  .resolveReference(({ id }) => ({ id, name: "..." }))
```

**3. Schema 级别 Directives**：
```ts
FederatedSchemaLoom.weave(
  resolver,
  FederatedSchemaLoom.config({
    extensions: {
      directives: {
        link: [{
          url: "https://specs.apollo.dev/federation/v2.6",
          import: ["@extends", "@external", "@key", "@shareable"]
        }]
      }
    }
  })
)
```

**源码实现**（`packages/core/src/schema/extensions.ts`）：
```ts
export interface GQLoomExtensions {
  directives?: DirectiveItem[] | DirectiveRecord
}

export interface DirectiveItem {
  name: string
  args?: Record<string, any>
}

export type DirectiveRecord = Record<string, Record<string, any>>
```

**Federation 支持**（`packages/federation/src/resolver.ts`）：
- `FederatedChainResolver.directives()` 方法支持链式配置
- 自动处理 Federation 的 `@key` 指令和 `resolveReference`
- 支持批量加载引用（`loadReference`）

**评估**：Directives 支持**中等偏上**。虽然不提供定义自定义 Directives 的高级 API，但通过 Extensions 可以灵活配置各种 Directives。Federation Directives 支持非常完善，有专门的包和链式 API。对于大多数使用场景，特别是 Federation 场景，支持已经足够。

### 4.2 Extensions（扩展）

**支持情况**：
- ✅ **字段级别扩展**：通过 `.extensions()` 方法为字段添加扩展
- ✅ **对象类型扩展**：通过 `resolver.of().extensions()` 为对象类型添加扩展
- ✅ **类型安全**：扩展配置类型安全

**使用方式**：
```ts
// 字段扩展
query(User)
  .extensions({ complexity: 10 })
  .resolve(...)

// 对象类型扩展
resolver.of(User, { ... })
  .extensions({ 
    directives: { loom: { value: "User" } }
  })
```

**源码实现**（`packages/core/src/schema/extensions.ts`）：
- 支持标准的 GraphQL Extensions 配置
- 自动合并扩展配置

**评估**：Extensions 支持完整，可以满足查询复杂度、权限等扩展需求。

### 4.3 批量加载（Batching）

**支持情况**：
- ✅ **内置 DataLoader**：通过 `.load()` 方法实现批量加载
- ✅ **路径感知缓存**：支持基于 GraphQL 查询路径的缓存策略
- ✅ **自动批处理**：自动收集同一 tick 内的请求并批量处理

**已在维度3中详细评估，此处不再重复。**

### 4.4 自定义标量（Scalars）

**支持情况**：
- ✅ **预设标量映射**：通过 `presetGraphQLType` 配置自定义标量映射
- ✅ **集成 graphql-scalars**：可以轻松集成 `graphql-scalars` 库的标量类型
- ✅ **类型映射**：支持将 Zod 类型映射到 GraphQL 标量

**使用方式**：
```ts
export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})
```

**业务代码示例**：
```ts
export const Order = z.object({
  createdAt: z.date(),  // 自动映射为 GraphQLDateTime
  // ...
})
```

**评估**：标量支持灵活，可以轻松集成常用标量类型，满足业务需求。

### 4.5 订阅（Subscription）

**支持情况**：
- ✅ **完整支持**：支持 GraphQL Subscription 的完整功能
- ✅ **链式 API**：提供链式 API 定义订阅
- ✅ **AsyncIterator 支持**：支持异步迭代器
- ✅ **中间件支持**：订阅支持中间件
- ✅ **Context 支持**：订阅支持 Context 注入

**使用方式**：
```ts
// 简单订阅
subscription(silk(GraphQLString))
  .subscribe(async function* () {
    yield "FooValue"
  })

// 带输入和解析的订阅
subscription(silk(GraphQLString))
  .input({ suffix: silk(GraphQLString) })
  .subscribe(fooGenerator)
  .resolve((value, input) => value + (input.suffix ?? ""))
```

**源码实现**（`packages/core/test/subscription.spec.ts`）：
- 支持同步和异步 `subscribe` 函数
- 支持可选的 `resolve` 函数处理订阅值
- 支持中间件链（包括 `subscription.subscribe` 和 `subscription.resolve` 两个阶段）

**评估**：Subscription 支持完整，API 设计清晰，满足实时数据推送需求。

### 4.6 上下文（Context）

**支持情况**：
- ✅ **AsyncLocalStorage**：使用 Node.js 的 `AsyncLocalStorage` 实现上下文传递
- ✅ **类型安全注入**：通过 `InjectableContext` 实现类型安全的依赖注入
- ✅ **Memoization**：支持上下文级别的缓存（`ContextMemoization`）
- ✅ **便捷 Hook**：提供 `useContext()` 和 `useResolverPayload()` Hook

**使用方式**：
```ts
// 创建可注入的上下文
const useDefaultName = createContext(() => "Default Name")

// 在 Resolver 中使用
const resolver = resolver({
  hello: query(silk(GraphQLString), () => {
    const name = useDefaultName()  // 获取上下文值
    return `Hello, ${name}!`
  })
})

// 注入上下文值
const schema = weave(
  asyncContextProvider.with(useDefaultName.provide(() => "John")),
  resolver
)
```

**源码实现**（`packages/core/src/context/context.ts`）：
- `asyncContextProvider` 中间件自动注入上下文
- `InjectableContext` 类实现依赖注入模式
- `ContextMemoization` 实现上下文级别的缓存

**评估**：Context 支持非常强大，提供了完整的依赖注入和上下文管理能力，适合大型应用。

### 4.7 中间件（Middleware）

**支持情况**：
- ✅ **完整支持**：支持在 Resolver 执行前后注入中间件逻辑
- ✅ **操作级别控制**：可以指定中间件应用于哪些操作（query、mutation、field、subscription）
- ✅ **多级中间件**：支持全局、Resolver 级别和字段级别的中间件
- ✅ **类型安全**：中间件函数类型安全

**使用方式**：
```ts
// 全局中间件
const schema = new GraphQLSchemaLoom()
  .use(globalMiddleware)
  .add(resolver)

// Resolver 级别中间件
const resolver = resolver(
  { ... },
  { middlewares: [resolverMiddleware] }
)

// 字段级别中间件
query(User)
  .use(fieldMiddleware)
  .resolve(...)
```

**中间件执行顺序**：
1. 全局中间件
2. Resolver 级别中间件
3. 字段级别中间件
4. Resolver 函数

**源码实现**（`packages/core/src/utils/middleware.ts`）：
- `applyMiddlewares()` 实现中间件链式执行
- `filterMiddlewares()` 根据操作类型过滤中间件
- 支持 `next()` 函数控制执行流程

**评估**：中间件支持完整，可以满足日志记录、权限检查、性能监控等需求。

### 4.8 内置功能总结

| 功能         | 支持情况   | 评估                                       |
| ------------ | ---------- | ------------------------------------------ |
| Directives   | ✅ 良好支持 | ⭐⭐⭐⭐ Extensions 配置 + Federation 完善支持 |
| Extensions   | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 类型安全，功能完整                   |
| Batching     | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 内置 DataLoader                      |
| Scalars      | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 灵活映射                             |
| Subscription | ✅ 完整支持 | ⭐⭐⭐⭐⭐ API 清晰                             |
| Context      | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 依赖注入模式                         |
| Middleware   | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 多级支持                             |

**优点**：
- ✅ 大部分功能支持完整，API 设计清晰
- ✅ Context 和 Middleware 支持非常强大
- ✅ 内置批量加载，减少样板代码

**缺点**：
- ⚠️ 不提供定义自定义 Directives 的高级 API（但可通过 Extensions 和底层 GraphQL API 实现）

**总体评价**：GQLoom 的内置功能非常全面。Directives 支持通过 Extensions 配置，Federation Directives 有专门的包和链式 API 支持。Context 和 Middleware 的设计尤其优秀，适合大型应用开发。

---

## 5. 生态集成

### 5.1 ORM 集成

GQLoom 提供了对主流 ORM 的深度集成支持，包括 Prisma、Drizzle 和 MikroORM。

#### 5.1.1 Prisma 集成

**支持情况**：
- ✅ **模型自动转换**：自动将 Prisma 模型转换为 GraphQL Schema
- ✅ **CRUD 自动生成**：通过 Resolver Factory 快速生成 CRUD 接口
- ✅ **自定义输入支持**：支持自定义输入和中间件

**包名**：`@gqloom/prisma`

**特点**：
- 直接复用 Prisma Schema 定义
- 自动生成类型安全的 Resolver
- 支持自定义输入验证和中间件

#### 5.1.2 Drizzle 集成

**支持情况**：
- ✅ **表结构自动转换**：自动将 Drizzle 表定义转换为 GraphQL Schema
- ✅ **CRUD 自动生成**：通过 Resolver Factory 快速生成 CRUD 接口
- ✅ **多数据库支持**：支持 PostgreSQL、MySQL、SQLite

**包名**：`@gqloom/drizzle`

**特点**：
- 支持 Drizzle 的所有数据库适配器
- 类型安全的查询构建
- 自动处理关联关系

#### 5.1.3 MikroORM 集成

**支持情况**：
- ✅ **实体 Schema 转换**：使用 MikroORM 的 Entity Schema 作为 GraphQL Schema
- ✅ **双向编织**：支持将 GraphQL Schema 编织回 MikroORM Entity Schema
- ✅ **操作自动生成**：从 Entity Schema 自动生成 GraphQL 操作

**包名**：`@gqloom/mikro-orm`

**特点**：
- 深度集成 MikroORM 的 Entity Schema 系统
- 支持双向转换
- 自动处理实体关系

**评估**：ORM 集成非常完善，三大主流 ORM 都有官方支持，可以显著减少样板代码。

### 5.2 验证库集成

GQLoom 通过 Weaver 模式支持多种验证库，每个验证库都有独立的集成包。

#### 5.2.1 Zod 集成

**支持情况**：
- ✅ **完整支持**：Zod 是 GQLoom 的主要验证库，支持最完整
- ✅ **Zod v3 和 v4**：同时支持 Zod v3 和 v4
- ✅ **自动类型映射**：自动将 Zod Schema 映射为 GraphQL 类型

**包名**：`@gqloom/zod`

**业务代码使用**：
```ts
import { ZodWeaver } from '@gqloom/zod'
import * as z from 'zod'

const User = z.object({
  id: z.int(),
  name: z.string(),
  email: z.email(),
})

export const schema = weave(ZodWeaver, userResolver)
```

#### 5.2.2 Valibot 集成

**支持情况**：
- ✅ **完整支持**：提供完整的 Valibot Schema 到 GraphQL Schema 的转换
- ✅ **类型安全**：完整的 TypeScript 类型推导

**包名**：`@gqloom/valibot`

**使用方式**：
```ts
import { ValibotWeaver } from '@gqloom/valibot'
import * as v from 'valibot'

const User = v.object({
  id: v.number(),
  name: v.string(),
})

export const schema = weave(ValibotWeaver, userResolver)
```

#### 5.2.3 Yup 集成

**支持情况**：
- ✅ **完整支持**：提供 Yup Schema 到 GraphQL Schema 的转换
- ✅ **类型安全**：支持 TypeScript 类型推导

**包名**：`@gqloom/yup`

**使用方式**：
```ts
import { YupWeaver } from '@gqloom/yup'
import { string, number } from 'yup'

const User = object({
  id: number(),
  name: string(),
})

export const schema = weave(YupWeaver, userResolver)
```

#### 5.2.4 Effect Schema 集成

**支持情况**：
- ✅ **完整支持**：提供 Effect Schema 到 GraphQL Schema 的转换
- ✅ **函数式编程**：支持 Effect 的函数式编程范式

**包名**：`@gqloom/effect`

**特点**：
- 支持 Effect 的类型系统
- 函数式编程风格
- 完整的类型安全

**评估**：验证库集成非常全面，支持 4 种主流验证库，开发者可以根据项目需求选择最适合的验证库。

### 5.3 Server 兼容性

GQLoom 生成的 GraphQL Schema 是标准的 GraphQL Schema 对象，可以与任何兼容 GraphQL.js 的 Server 框架集成。

#### 5.3.1 GraphQL Yoga

**支持情况**：
- ✅ **完美兼容**：GQLoom 官方示例使用 GraphQL Yoga

**业务代码示例**：
```ts
import { createYoga } from 'graphql-yoga'
import { schema } from './schema.ts'

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000)
```

#### 5.3.2 Apollo Server

**支持情况**：
- ✅ **完全兼容**：GQLoom 生成的 Schema 可以直接用于 Apollo Server
- ✅ **Federation 支持**：通过 `@gqloom/federation` 包支持 Apollo Federation

**Federation 支持**：
```ts
import { resolveReference } from '@gqloom/federation'

resolver.of(User, {
  // ...
}).extensions(
  resolveReference<User, 'id'>((source) => {
    // resolve reference logic
  })
)
```

#### 5.3.3 其他 Server 框架

**支持情况**：
- ✅ **Fastify**：通过 `mercurius` 或直接使用 GraphQL Schema
- ✅ **Hono**：通过 `@hono/graphql-server` 集成
- ✅ **Express**：通过 `express-graphql` 或 `apollo-server-express` 集成
- ✅ **Next.js**：支持 Next.js API Routes

**评估**：Server 兼容性优秀，GQLoom 生成的 Schema 是标准 GraphQL Schema，可以与任何 GraphQL Server 框架集成。

### 5.4 生态集成总结

| 集成类型      | 支持情况   | 评估                |
| ------------- | ---------- | ------------------- |
| Prisma        | ✅ 完整支持 | ⭐⭐⭐⭐⭐ CRUD 自动生成 |
| Drizzle       | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 多数据库支持  |
| MikroORM      | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 双向转换      |
| Zod           | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 主要验证库    |
| Valibot       | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 轻量级选择    |
| Yup           | ✅ 完整支持 | ⭐⭐⭐⭐ 成熟稳定       |
| Effect        | ✅ 完整支持 | ⭐⭐⭐⭐ 函数式编程     |
| GraphQL Yoga  | ✅ 完美兼容 | ⭐⭐⭐⭐⭐ 官方推荐      |
| Apollo Server | ✅ 完全兼容 | ⭐⭐⭐⭐⭐ 企业级支持    |
| Federation    | ✅ 完整支持 | ⭐⭐⭐⭐⭐ 官方包支持    |

**优点**：
- ✅ ORM 集成非常完善，三大主流 ORM 都有官方支持
- ✅ 验证库集成全面，支持 4 种主流验证库
- ✅ Server 兼容性优秀，标准 GraphQL Schema 可适配任何框架
- ✅ Federation 支持完整，适合微服务架构

**缺点**：
- ⚠️ 无（生态集成非常完善）

**总体评价**：GQLoom 的生态集成非常完善，覆盖了主流的 ORM、验证库和 Server 框架。通过 Weaver 模式，可以轻松扩展支持新的验证库或 ORM。Federation 支持使得 GQLoom 适合大型微服务架构。

---

## 总结

### 综合评估

| 维度                    | 评分  | 评价                                    |
| ----------------------- | ----- | --------------------------------------- |
| 1. 架构模式             | ⭐⭐⭐⭐⭐ | Weaving 模式，依赖极轻量，安装即用      |
| 2. 类型定义             | ⭐⭐⭐⭐⭐ | 单一数据源，零配置枚举，自动 Union 支持 |
| 3. 解析器定义与输入验证 | ⭐⭐⭐⭐⭐ | 链式 API，完整类型推导，内置批量加载    |
| 4. 内置功能             | ⭐⭐⭐⭐⭐ | 功能全面，Directives 支持良好           |
| 5. 生态集成             | ⭐⭐⭐⭐⭐ | ORM 和验证库集成完善，Server 兼容性优秀 |

### 核心优势

1. **极轻量依赖**：核心库仅依赖 GraphQL，无运行时元数据反射需求
2. **单一数据源**：通过 Zod/Valibot 等验证库实现类型定义、验证和 GraphQL Schema 的完全统一
3. **现代化架构**：Weaving 模式支持模块化开发，适合大型项目
4. **完整类型安全**：从输入到输出，完整的 TypeScript 类型推导
5. **生态完善**：支持主流 ORM、验证库和 Server 框架

### 适用场景

- ✅ **中小型项目**：快速开发，减少样板代码
- ✅ **大型项目**：模块化组织，支持领域驱动开发
- ✅ **微服务架构**：Federation 支持，适合分布式系统
- ✅ **类型安全优先**：完整的 TypeScript 类型推导
- ✅ **验证库优先**：已使用 Zod/Valibot/Yup 的项目

### 不适用场景

- ❌ **装饰器偏好**：如果团队偏好装饰器模式，可能需要考虑其他方案

### 结论

GQLoom 是一个**现代化、轻量级、类型安全**的 GraphQL Schema 构建库。通过 Weaving 模式和 Weaver 架构，实现了极低的依赖复杂度和优秀的模块化支持。虽然 Directives 支持较弱，但在其他维度都表现优秀，特别适合追求类型安全和开发效率的团队。

**推荐指数**：⭐⭐⭐⭐⭐（5/5）

