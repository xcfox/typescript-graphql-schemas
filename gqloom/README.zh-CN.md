# GQLoom 评估报告 (2026)

> 本报告基于实际业务代码 (`typescript-graphql-schemas/gqloom/src`) 及官方示例 (`@gqloom/examples`) 生成。

## 📋 基本信息
| 项目         | 内容                                  |
| :----------- | :------------------------------------ |
| **当前版本** | 0.15.0                                |
| **GitHub**   | https://github.com/modevol-com/gqloom |
| **文档站**   | https://gqloom.dev                    |
| **初次提交** | 2024-03-14                            |
| **最近提交** | 2026-01-02                            |

## 📊 综合评分
| 维度                | 得分 (1-5) | 简评                                                        |
| :------------------ | :--------- | :---------------------------------------------------------- |
| **1. 架构模式**     | 5/5        | 极简依赖、纯运行时构建、零魔法、完全中立                    |
| **2. 类型定义**     | 4/5        | 深度推断、零配置枚举、智能继承、强大类型推断                |
| **3. 解析器与验证** | 5/5        | 极简代码、链式 API、声明式验证、原生 DataLoader             |
| **4. 内置功能**     | 4/5        | 核心功能完善、Context/Middleware/DataLoader 原生支持        |
| **5. 生态集成**     | 5/5        | 深度 ORM 集成、无缝验证库集成、完全 Server 兼容、全框架支持 |

---

## 1. 架构模式 (Architecture)

### 架构模式概述

GQLoom 采用 **Weaving（编织）模式**，通过 `weave()` 函数在运行时将 Resolver 定义和运行时类型（如 Zod Schema）组合成 GraphQL Schema。核心设计理念是"零魔法"：不使用装饰器、反射元数据或代码生成，完全基于原生 TypeScript 和 JavaScript 运行。

**核心实现位置**：
- `packages/core/src/schema/schema-loom.ts`：`GraphQLSchemaLoom` 类和 `weave()` 函数
- `packages/core/src/resolver/resolver.ts`：Resolver 工厂函数和链式 API
- `packages/zod/src/index.ts`：Zod Weaver 实现，将 Zod Schema 转换为 GraphQL 类型

### 1.1 依赖复杂度 (Dependency Complexity)

**评分：⭐⭐⭐⭐⭐ (5/5)**

**核心依赖分析**：
- `@gqloom/core` 的 `package.json` 显示：
  - **Peer Dependency**：仅 `graphql >= 16.8.0`（标准 GraphQL 库）
  - **Dev Dependency**：`@standard-schema/spec`（仅用于类型定义，不参与运行时）
  - **运行时依赖**：零额外依赖

**证据**：
```json
// packages/core/package.json
"peerDependencies": {
  "graphql": ">= 16.8.0"
},
"devDependencies": {
  "@standard-schema/spec": "1.1.0"
}
```

**结论**：GQLoom 实现了极简依赖设计，仅依赖 GraphQL 标准库，零运行时开销，无额外第三方依赖。

### 1.2 构建流程 (Build Flow)

**评分：⭐⭐⭐⭐⭐ (5/5)**

**构建方式**：
- 使用 `tsdown` 进行编译（`packages/core/tsdown.config.ts`），支持 ESM 和 CJS 双格式输出
- **纯运行时构建**：无需任何代码生成（CodeGen）或专门的 CLI 构建步骤
- Schema 生成完全在运行时完成，通过 `weave()` 函数直接生成 `GraphQLSchema` 实例

**实际使用证据**：
```typescript
// src/schema.ts
export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)

// src/print.ts - 仅用于打印 Schema，非必需步骤
const sdl = printSchema(lexicographicSortSchema(schema))
```

**结论**：即写即用，纯运行时构建，无需任何代码生成或专门的构建步骤。开发者可以直接在代码中调用 `weave()` 生成 Schema，也可以选择性地使用 `printSchema()` 生成 SDL 文件。

### 1.3 配置魔法 (Config & Language Magic)

**评分：⭐⭐⭐⭐⭐ (5/5)**

**技术实现**：
- **不使用装饰器**：通过 grep 搜索确认，核心代码中无 `decorator`、`reflect`、`metadata` 关键字
- **不使用反射元数据**：完全基于原生 TypeScript 类型系统和对象元数据
- **元数据存储**：使用 Symbol 和对象属性（`~meta`）存储 Resolver 元信息

**核心实现证据**：
```typescript
// packages/core/src/resolver/resolver.ts
export const resolver: ResolverFactory = Object.assign(
  ((operations, options) => new ChainResolver(operations, options)) as ResolverFactory,
  { /* ... */ }
)

// 使用 Symbol 标识 Resolver
export const IS_RESOLVER = Symbol.for("gqloom.resolver")
export const WEAVER_CONFIG = Symbol.for("gqloom.weaver_config")
```

**实际使用方式**：
```typescript
// src/resolvers/user.ts - 完全函数式 API，无装饰器
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order))).load(/* ... */),
  users: query(z.array(User), () => Array.from(userMap.values())),
  // ...
})
```

**结论**：零魔法，不依赖装饰器、反射元数据或非标准 TS 语法，完全符合原生 TypeScript 最佳实践。

### 1.4 生态集成 (Ecosystem Integration)

**评分：⭐⭐⭐⭐⭐ (5/5)**

**集成方式**：
- **标准 npm 安装**：通过 `npm install @gqloom/core @gqloom/zod` 即可使用
- **插件系统**：通过 Weaver 接口（`SchemaWeaver`）支持多种验证库和 ORM
- **Web 框架兼容**：官方示例（`examples/adapters`）展示了与 Apollo Server、GraphQL Yoga、Mercurius、Hono 的集成

**官方适配器示例**：
```typescript
// examples/adapters/src/yoga.ts
import { createYoga } from "graphql-yoga"
const schema = weave(helloResolver)
const yoga = createYoga({ schema })
```

**插件生态**：
- 验证库集成：`@gqloom/zod`、`@gqloom/valibot`、`@gqloom/yup`
- ORM 集成：`@gqloom/prisma`、`@gqloom/drizzle`、`@gqloom/mikro-orm`
- 其他功能：`@gqloom/federation`、`@gqloom/effect`、`@gqloom/json`

**结论**：完全中立，支持标准 `npm install`，可自由搭配任何 Web 框架和打包工具。通过 Weaver 插件系统实现灵活的生态集成。

### 架构模式总结

| 评估项         | 得分  | 说明                                  |
| :------------- | :---- | :------------------------------------ |
| **依赖复杂度** | ⭐⭐⭐⭐⭐ | 仅依赖 `graphql` 标准库，零运行时开销 |
| **构建流程**   | ⭐⭐⭐⭐⭐ | 纯运行时构建，无需代码生成            |
| **配置魔法**   | ⭐⭐⭐⭐⭐ | 零魔法，不使用装饰器、反射元数据      |
| **生态集成**   | ⭐⭐⭐⭐⭐ | 完全中立，标准 npm 安装，支持多种框架 |

**综合评分：5/5**

GQLoom 的架构设计体现了"极简主义"理念：通过 Weaving 模式在运行时组合 Resolver 和类型定义，完全避免装饰器和代码生成，实现了零魔法、零依赖的轻量级 GraphQL Schema 构建方案。

## 2. 类型定义 (Type Definition)

### 类型定义概述

GQLoom 采用 **运行时类型作为单一数据源（SSOT）** 的设计理念。Zod Schema 既是运行时验证规则，也是 GraphQL Schema 的类型定义，同时通过 TypeScript 的 `z.infer` 自动推导出 TypeScript 类型。这种设计实现了"一份定义，三重用途"的极致统一。

**核心实现位置**：
- `packages/zod/src/index.ts`：Zod Weaver 实现，将 Zod Schema 转换为 GraphQL 类型
- `packages/core/src/resolver/input.ts`：输入类型推断（`InferInputI`、`StandardSchemaV1.InferInput`）
- `packages/zod/src/utils.ts`：类型转换工具函数，处理接口、联合类型等复杂场景

### 2.1 单一数据源（Single Source of Truth）实现度

**评分：⭐⭐⭐⭐ (4/5)**

**实现方式**：
- **Zod Schema 作为唯一数据源**：定义一次，同时用于 TypeScript 类型、运行时验证和 GraphQL Schema
- **TypeScript 类型**：通过 `z.infer<typeof Schema>` 自动推导
- **GraphQL Schema**：通过 Weaver 在运行时自动从 Zod Schema 生成
- **验证逻辑**：通过 `StandardSchemaV1` 接口统一，验证逻辑来自 Zod Schema 本身

**实际使用证据**：
```typescript
// src/resolvers/menu.ts
export const Food = z.object({
  __typename: z.literal('Food').nullish(),
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// TypeScript 类型自动推断
export const menuMap = new Map<number, z.infer<typeof MenuItem>>(/* ... */)

// GraphQL Schema 自动生成（通过 weave）
export const schema = weave(ZodWeaver, zodWeaverConfig, menuResolver)
```

**验证逻辑统一**：
```typescript
// packages/core/src/resolver/input.ts
// 输入验证直接使用 Schema 的 validate 方法
return inputSchema["~standard"].validate(input)
```

**不足之处**：
- 需要手动在 Schema 中定义 `__typename` 字段用于 Union 类型区分
- 接口继承需要显式调用 `.register(asObjectType, { interfaces: [Food] })`，不能完全自动推断

**结论**：深度推断。核心定义（Zod Schema）即 Schema，TypeScript 类型和 GraphQL Schema 通过类型工具自动提取，仅需少量辅助配置（如接口注册）。

### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**实现方式**：
- **直接支持 Zod Enum**：`z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])` 自动转换为 GraphQL Enum
- **零配置复用**：无需手动注册，无需重定义成员名称
- **支持字符串字面量**：通过 `z.literal()` 支持字符串字面量类型

**实际使用证据**：
```typescript
// src/resolvers/menu.ts
const SugarLevel = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH'])

// src/resolvers/order.ts
export const OrderStatus = z.enum(['PENDING', 'COMPLETED'])

// 直接使用，无需额外配置
export const Coffee = Food.extend({
  sugarLevel: SugarLevel,  // 自动转换为 GraphQL Enum
  // ...
})
```

**核心实现**：
```typescript
// packages/zod/src/index.ts
if (isZodEnum(schema)) {
  const values: GraphQLEnumValueConfigMap = {}
  Object.entries(schema._zod.def.entries).forEach(([key, value]) => {
    values[key] = { value, ...valuesConfig?.[key] }
  })
  return new GraphQLEnumType({ name, values, ...enumConfig })
}
```

**结论**：零配置复用。直接支持 TypeScript 原生 `enum` 或字符串联合类型（通过 `z.enum()`），无需任何手动注册。

### 2.3 接口继承与联合类型体验（Interface & Union）

**评分：⭐⭐⭐⭐ (4/5)**

**接口继承实现**：
- **字段自动继承**：通过 `Food.extend()` 定义的子类型自动继承父类型的所有字段
- **显式接口注册**：需要调用 `.register(asObjectType, { interfaces: [Food] })` 声明接口关系
- **接口类型转换**：通过 `ZodWeaver.ensureInterfaceType()` 将 Zod Object 转换为 GraphQL Interface

**实际使用证据**：
```typescript
// src/resolvers/menu.ts
export const Food = z.object({
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

// 字段自动继承，无需重复定义 id, name, price
export const Coffee = Food.extend({
  __typename: z.literal('Coffee'),
  sugarLevel: SugarLevel,
  origin: z.string(),
}).register(asObjectType, { interfaces: [Food] })  // 显式声明接口关系
```

**联合类型实现**：
- **直接支持 `z.union()`**：`z.union([Coffee, Dessert])` 自动转换为 GraphQL Union
- **Discriminated Union 支持**：支持通过 `z.discriminatedUnion()` 定义，自动处理 `__typename` 字段
- **类型决议**：通过 `resolveTypeByDiscriminatedUnion()` 函数自动根据 `__typename` 字段决议类型

**实际使用证据**：
```typescript
// src/resolvers/menu.ts
export const MenuItem = z.union([Coffee, Dessert])  // 直接使用，自动转换

// 在 Resolver 中需要手动返回 __typename
.resolve(({ name, price, sugarLevel, origin }) => {
  const newItem = { id, name, price, sugarLevel, origin, __typename: 'Coffee' as const }
  return newItem
})
```

**核心实现**：
```typescript
// packages/zod/src/index.ts
if (isZodUnion(schema)) {
  return new GraphQLUnionType({
    resolveType: isZodDiscriminatedUnion(schema)
      ? resolveTypeByDiscriminatedUnion(schema)  // 自动处理 Discriminated Union
      : undefined,
    types,
    name,
  })
}
```

**不足之处**：
- 需要在 Schema 中手动定义 `__typename` 字段（虽然可以设置为 `nullish()`）
- 接口继承需要显式注册，不能完全自动推断

**结论**：智能继承。支持字段继承，Union 类型的决议通过 Discriminated Union 自动处理，但需要显式的接口注册和 `__typename` 字段定义。

### 2.4 类型推断强度与显式声明平衡

**评分：⭐⭐⭐⭐ (4/5)**

**输入类型推断**：
- **完全自动推断**：通过 `InferInputI` 和 `StandardSchemaV1.InferInput` 自动推导输入参数类型
- **链式 API 支持**：`.input({ id: z.int() })` 中的类型自动推断，IDE 提示完善

**输出类型推断**：
- **完全自动推断**：通过 `StandardSchemaV1.InferOutput` 自动推导返回值类型
- **Resolver 返回值类型**：自动从 Schema 推断，无需手动声明

**实际使用证据**：
```typescript
// src/resolvers/user.ts
user: query(User)  // 输出类型自动推断为 z.infer<typeof User>
  .input({ id: z.int() })  // 输入类型自动推断为 { id: number }
  .resolve(({ id }) => {  // id 的类型自动推断为 number
    const user = userMap.get(id)
    return user  // 返回值类型自动推断
  })
```

**基础类型推断**：
- **标量类型**：`z.string()` → `GraphQLString`，`z.int()` → `GraphQLInt`，自动推断
- **数组类型**：`z.array(Type)` → `GraphQLList`，自动推断
- **可空性**：`z.nullish()`、`z.optional()` 自动处理可空性

**循环引用处理**：
- **需要显式使用 `z.lazy()`**：处理循环引用时需要手动包装

**实际使用证据**：
```typescript
// src/resolvers/user.ts
orders: field(z.array(z.lazy(() => Order)))  // 需要显式使用 z.lazy()
  .load((users) => { /* ... */ })
```

**核心实现**：
```typescript
// packages/core/src/resolver/input.ts
export type InferInputI<TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void> =
  TInput extends GraphQLSilk
    ? StandardSchemaV1.InferInput<TInput>  // 自动推断输入类型
    : TInput extends Record<string, GraphQLSilk>
      ? { [K in keyof TInput]: StandardSchemaV1.InferInput<TInput[K]> }
      : void
```

**不足之处**：
- 循环引用需要显式使用 `z.lazy()`
- 复杂嵌套类型可能需要少量类型注解

**结论**：强大推断。Builder API 能自动推导绝大部分类型，仅在循环引用或复杂嵌套时需少量显式标注（如 `z.lazy()`）。

### 类型定义总结

| 评估项                     | 得分  | 说明                                                                      |
| :------------------------- | :---- | :------------------------------------------------------------------------ |
| **单一数据源（SSOT）**     | ⭐⭐⭐⭐  | 深度推断，Zod Schema 即 Schema，TypeScript 和 GraphQL 类型自动提取        |
| **枚举与字符串联合支持**   | ⭐⭐⭐⭐⭐ | 零配置复用，直接支持 `z.enum()`，无需手动注册                             |
| **接口继承与联合类型体验** | ⭐⭐⭐⭐  | 智能继承，字段自动继承，Union 自动处理，但需要显式接口注册和 `__typename` |
| **类型推断强度**           | ⭐⭐⭐⭐  | 强大推断，基础类型、数组、可空性自动推断，循环引用需 `z.lazy()`           |

**综合评分：4.25/5（四舍五入为 4/5）**

GQLoom 的类型定义系统实现了"一份定义，三重用途"的设计理念，通过深度推断实现了 Zod Schema、TypeScript 类型和 GraphQL Schema 的统一。虽然在接口继承和循环引用处理上需要少量显式配置，但整体类型推断能力强大，开发体验优秀。

## 3. 解析器与验证 (Resolvers & Validation)

### 解析器与验证概述

GQLoom 的解析器系统采用**链式 API 设计**，通过 `resolver()`、`query()`、`mutation()`、`field()` 等工厂函数创建类型安全的 Resolver。验证逻辑与 Schema 定义完全合一，通过 Zod Schema 的验证方法（如 `.refine()`、`.email()`）实现声明式验证。DataLoader 支持通过 `.load()` 方法原生集成，几乎无样板代码。

**核心实现位置**：
- `packages/core/src/resolver/resolver.ts`：Resolver 工厂函数和链式 API
- `packages/core/src/resolver/resolver-chain-factory.ts`：链式工厂类，提供 `.input()`、`.resolve()`、`.load()` 等方法
- `packages/core/src/resolver/input.ts`：输入验证和类型推断
- `packages/core/src/utils/loader.ts`：内置 DataLoader 实现

### 3.1 开发体验（代码简洁度）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**代码特点**：
- **链式 API**：通过 `.input()`、`.resolve()`、`.use()` 等方法链式配置
- **类型定义与 Resolver 合一**：Schema 定义即 Resolver 定义，无需分离
- **几乎无样板代码**：无需装饰器、配置对象或额外的类型声明

**实际使用证据**：
```typescript
// src/resolvers/user.ts - 代码极简，链式 API 直观
export const userResolver = resolver.of(User, {
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
})
```

**代码量对比**：
- 完整的 User 模块（包含 Query、Mutation、Field Resolver）仅需约 70 行代码
- 无装饰器、无配置对象、无额外的类型声明文件

**结论**：代码极简，几乎无样板代码，类型定义与 Resolver 合一，链式 API 直观。

### 3.2 模块化设计（领域驱动开发支持）

**评分：⭐⭐⭐⭐ (4/5)**

**模块化实现**：
- **按领域组织**：通过 `resolver()` 和 `resolver.of()` 创建领域模块边界
- **文件拆分**：可以按领域拆分文件（`user.ts`、`menu.ts`、`order.ts`）
- **模块合并**：通过 `weave()` 函数合并多个 Resolver 模块

**实际使用证据**：
```typescript
// src/resolvers/user.ts - User 领域模块
export const userResolver = resolver.of(User, {
  orders: field(/* ... */),
  users: query(/* ... */),
  user: query(/* ... */),
  createUser: mutation(/* ... */),
  // ...
})

// src/resolvers/menu.ts - Menu 领域模块
export const menuResolver = resolver({
  menu: query(/* ... */),
  menuItem: query(/* ... */),
  createCoffee: mutation(/* ... */),
  // ...
})

// src/schema.ts - 模块合并
export const schema = weave(ZodWeaver, zodWeaverConfig, userResolver, menuResolver, orderResolver)
```

**模块边界**：
- `resolver.of(ParentType, fields)`：为对象类型创建 Field Resolver
- `resolver(operations)`：创建 Query/Mutation 操作
- 每个 Resolver 都是独立的模块，可以单独测试和维护

**不足之处**：
- 不强制模块化，开发者可以写出耦合的巨型文件（但通过设计可以避免）

**结论**：支持领域模块化，提供了模块化 API，可以按领域拆分文件，需要开发者自觉遵守模块化原则。

### 3.3 参数定义与类型推导

**评分：⭐⭐⭐⭐⭐ (5/5)**

**类型推导实现**：
- **参数类型完全自动推断**：通过 `.input()` 定义的参数类型自动推断
- **链式 API 类型推导**：`.input()` 返回的类型自动推导到 `.resolve()` 函数参数
- **IDE 提示完善**：TypeScript 类型系统提供完整的类型提示

**实际使用证据**：
```typescript
// src/resolvers/user.ts
user: query(User)
  .input({ id: z.int() })  // 输入类型自动推断为 { id: number }
  .resolve(({ id }) => {   // id 的类型自动推断为 number，IDE 提示完善
    const user = userMap.get(id)
    return user
  })

// src/resolvers/order.ts
createOrder: mutation(Order)
  .input({
    userId: z.int().refine(/* ... */),
    items: z.array(z.int().refine(/* ... */)).min(1),
  })
  .resolve(({ userId, items }) => {  // 参数类型完全自动推断
    // userId: number, items: number[]
  })
```

**核心实现**：
```typescript
// packages/core/src/resolver/input.ts
export type InferInputI<TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void> =
  TInput extends Record<string, GraphQLSilk>
    ? { [K in keyof TInput]: StandardSchemaV1.InferInput<TInput[K]> }
    : void
```

**结论**：参数类型完全自动推断，无需手动声明，IDE 提示完善。支持链式 API 或函数参数自动推断，类型从 Schema 定义自动推导。

### 3.4 输入验证机制

**评分：⭐⭐⭐⭐⭐ (5/5)**

**验证实现**：
- **声明式验证**：验证逻辑与 Schema 定义完全合一，通过 Zod Schema 的验证方法实现
- **格式验证**：支持 `z.email()`、`z.string().min()` 等格式验证
- **自定义验证**：支持 `.refine()` 方法实现自定义验证逻辑
- **自动验证**：输入验证在 Resolver 执行前自动进行，无需手动调用验证函数

**实际使用证据**：
```typescript
// src/resolvers/user.ts
createUser: mutation(User)
  .input({
    name: z.string(),           // 格式验证
    email: z.email(),           // 邮箱格式验证（自动）
  })
  .resolve(({ name, email }) => {
    // 验证已自动完成，此处直接使用已验证的数据
  })

// src/resolvers/order.ts
createOrder: mutation(Order)
  .input({
    userId: z.int().refine((id: number) => userMap.has(id), 'User not found'),
    items: z
      .array(z.int().refine((id: number) => menuMap.has(id), 'Menu item not found'))
      .min(1, 'At least one item is required'),
  })
  .resolve(({ userId, items }) => {
    // 所有验证逻辑都在 Schema 定义中，自动执行
  })
```

**核心实现**：
```typescript
// packages/core/src/resolver/input.ts
export function parseInputValue<TSchema>(
  inputSchema: TSchema,
  input: any
): MayPromise<StandardSchemaV1.Result<InferInputO<TSchema>>> {
  if (isSilk(inputSchema)) {
    return inputSchema["~standard"].validate(input)  // 自动验证
  }
  // ...
}
```

**验证错误处理**：
- 验证失败时自动抛出 `GraphQLError`，包含验证错误信息
- 错误信息来自 Zod Schema 的验证规则

**结论**：声明式验证，验证逻辑与 Schema 定义完全合一，支持格式验证（如 `z.email()`）和自定义验证（如 `.refine()`），自动验证，无需额外插件。

### 3.5 批量加载（DataLoader）集成

**评分：⭐⭐⭐⭐⭐ (5/5)**

**DataLoader 实现**：
- **原生内置支持**：通过 `.load()` 方法无缝调用 DataLoader
- **几乎无样板代码**：只需定义 `.load()` 函数，无需配置 Context 或创建 DataLoader 实例
- **自动批处理**：自动将多个请求批处理，减少数据库查询次数
- **路径感知**：支持按 GraphQL 查询路径进行缓存，避免重复查询

**实际使用证据**：
```typescript
// src/resolvers/user.ts
export const userResolver = resolver.of(User, {
  orders: field(z.array(z.lazy(() => Order)))
    .load((users) => {  // 只需定义 load 函数，无需配置 Context
      const userOrders = new Map<number, z.infer<typeof Order>[]>()
      for (const order of orderMap.values()) {
        const orders = userOrders.get(order.userId) ?? []
        orders.push(order)
        userOrders.set(order.userId, orders)
      }
      return users.map((user) => userOrders.get(user.id) ?? [])
    }),
})
```

**核心实现**：
```typescript
// packages/core/src/resolver/resolver-chain-factory.ts
public load<TParent extends GraphQLSilk>(
  resolve: (
    parents: InferParent<TParent, TDependencies>[],
    input: InferInputO<TInput>,
    payloads: (ResolverPayload | undefined)[]
  ) => MayPromise<StandardSchemaV1.InferOutput<TOutput>[]>
): Loom.Field<TParent, TOutput, TInput, TDependencies> {
  return createField(this.options.output, {
    resolve: (parent, input, payload) => {
      const loader = FieldLoader.getByPath(payload, resolve, /* ... */)
      return loader.load([parent, input, payload])  // 自动批处理
    },
  })
}
```

**DataLoader 特性**：
- 自动批处理：将同一 tick 内的多个请求合并为一次批量查询
- 自动缓存：同一查询路径的相同请求自动缓存
- 路径感知：根据 GraphQL 查询路径区分不同的 DataLoader 实例

**结论**：原生内置支持，无缝调用 dataloader，几乎没有样板代码。只需定义 `.load()` 或 `load` 函数，无需配置 Context 或创建 DataLoader 实例。

### 解析器与验证总结

| 评估项                     | 得分  | 说明                                                                 |
| :------------------------- | :---- | :------------------------------------------------------------------- |
| **开发体验（代码简洁度）** | ⭐⭐⭐⭐⭐ | 代码极简，几乎无样板代码，类型定义与 Resolver 合一，链式 API 直观    |
| **模块化设计**             | ⭐⭐⭐⭐  | 支持领域模块化，提供了模块化 API，可以按领域拆分文件                 |
| **参数定义与类型推导**     | ⭐⭐⭐⭐⭐ | 参数类型完全自动推断，无需手动声明，IDE 提示完善                     |
| **输入验证机制**           | ⭐⭐⭐⭐⭐ | 声明式验证，验证逻辑与 Schema 定义完全合一，支持格式验证和自定义验证 |
| **批量加载（DataLoader）** | ⭐⭐⭐⭐⭐ | 原生内置支持，无缝调用，几乎没有样板代码                             |

**综合评分：4.8/5（四舍五入为 5/5）**

GQLoom 的解析器系统通过链式 API 实现了极简的开发体验，验证逻辑与 Schema 定义完全合一，DataLoader 原生集成，整体设计优秀，开发效率极高。

## 4. 内置功能 (Built-in Features)

### 内置功能概述

GQLoom 通过核心 API 和插件系统提供了丰富的内置功能，包括 Context 注入、Middleware、DataLoader、Subscriptions 等。大部分功能与核心 API 深度集成，保持类型安全，减少样板代码。

**核心功能位置**：
- `packages/core/src/context/`：Context 注入和 Memoization
- `packages/core/src/utils/middleware.ts`：中间件系统
- `packages/core/src/utils/loader.ts`：DataLoader 实现
- `packages/core/src/resolver/resolver.ts`：Subscription 支持
- `packages/core/src/schema/extensions.ts`：Extensions 支持

### 内置功能详细评估

| 功能                           | 支持情况        | 说明                                                                                                                                                                                               |
| :----------------------------- | :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指令支持（Directives）**     | ⚠️ 插件/额外实现 | 不内置支持自定义 Directives 定义，但支持通过 Extensions 声明 Directives（如 `extensions: { directives: { loom: { value: "Animal" } } }`），可通过 `@gqloom/federation` 插件支持联邦架构 Directives |
| **扩展支持（Extensions）**     | ✅ 内置支持      | 原生支持 GraphQL Extensions 的定义和使用，可通过 `.extensions()` 方法声明查询复杂度、执行时间等扩展信息，API 直观                                                                                  |
| **批量加载（DataLoader）**     | ✅ 内置支持      | 原生内置 DataLoader 支持，通过 `.load()` 方法无缝调用，几乎没有样板代码（已在 Phase 4 详细评估）                                                                                                   |
| **自定义标量（Scalars）**      | ✅ 内置支持      | 支持通过 `presetGraphQLType` 配置自定义标量类型，可集成 `graphql-scalars` 等库，API 直观且类型安全                                                                                                 |
| **订阅（Subscription）**       | ✅ 内置支持      | 原生支持 GraphQL Subscriptions，支持实时数据推送，底层传输协议兼容性好（WebSocket, SSE 等），API 简洁                                                                                              |
| **上下文（Context）注入**      | ✅ 内置支持      | 原生支持在 Resolver 中注入上下文，提供 `useContext()`、`createContext()`、`createMemoization()` 等 API，类型推导完善，IDE 提示良好                                                                 |
| **中间件（Middleware）**       | ✅ 内置支持      | 原生支持在 Resolver 执行前后注入中间件逻辑，通过 `.use()` 方法链式调用，支持按操作类型过滤，API 简洁                                                                                               |
| **查询复杂度分析**             | ⚠️ 插件/额外实现 | 不内置支持，但可通过 Extensions 声明复杂度（如 `.extensions({ complexity: 10 })`），需要配合 `graphql-query-complexity` 等库使用                                                                   |
| **深度限制（Depth Limiting）** | ⚠️ 插件/额外实现 | 不内置支持，需要通过 GraphQL Server 的中间件或插件实现（如 `graphql-depth-limit`），GQLoom 本身不提供深度限制功能                                                                                  |

### 4.1 指令支持（Directives）

**评分：⚠️ 插件/额外实现**

**实现方式**：
- **不内置自定义 Directives 定义**：GQLoom 核心不提供定义自定义 Directives 的 API
- **支持通过 Extensions 声明 Directives**：可以通过 `extensions` 配置声明 Directives 信息
- **联邦架构支持**：通过 `@gqloom/federation` 插件支持 Apollo Federation Directives

**实际使用证据**：
```typescript
// packages/core/src/schema/extensions.ts
export interface GQLoomExtensions {
  directives?: DirectiveItem[] | DirectiveRecord
}

// 可以通过 extensions 声明 Directives
extensions: {
  directives: { loom: { value: "Animal" } }
}
```

**结论**：不内置支持，但可通过官方插件（`@gqloom/federation`）或手动扩展 Extensions 来实现 Directives 功能，需要额外配置。

### 4.2 扩展支持（Extensions）

**评分：✅ 内置支持**

**实现方式**：
- **原生支持 Extensions**：通过 `.extensions()` 方法声明扩展信息
- **支持查询复杂度声明**：可以声明字段或操作的复杂度
- **支持自定义扩展**：可以声明任意扩展信息

**实际使用证据**：
```typescript
// examples/query-complexity/src/zod.ts
posts: query(z.array(Post))
  .input({ limit: z.number().int().nullish().default(10) })
  .extensions({
    complexity: (args: ComplexityEstimatorArgs) => {
      return args.childComplexity * (args.args.limit ?? 10)
    },
  })
  .resolve(() => [])

// 字段级别的复杂度声明
description: z.string().register(asField, { complexity: 2 })
```

**核心实现**：
```typescript
// packages/core/src/resolver/resolver-chain-factory.ts
public extensions(extensions: GraphQLFieldOptions["extensions"]): this {
  return this.clone({ extensions })
}
```

**结论**：原生支持 GraphQL Extensions 的定义和使用，能够声明查询复杂度（complexity）、执行时间等扩展信息，API 直观。

### 4.3 批量加载（DataLoader）集成

**评分：✅ 内置支持**

**实现方式**：
- **原生内置支持**：通过 `.load()` 方法无缝调用 DataLoader
- **几乎无样板代码**：无需配置 Context 或创建 DataLoader 实例
- **自动批处理和缓存**：自动将多个请求批处理，支持路径感知缓存

**详细评估**：已在 Phase 4 中详细评估，此处不再重复。

**结论**：原生内置支持，无缝调用 dataloader，几乎没有样板代码。

### 4.4 自定义标量（Scalars）

**评分：✅ 内置支持**

**实现方式**：
- **通过 `presetGraphQLType` 配置**：在 Weaver 配置中声明自定义标量类型映射
- **支持 `graphql-scalars`**：可以集成常用的标量类型库
- **类型安全**：标量类型与 Schema 定义类型安全

**实际使用证据**：
```typescript
// src/schema.ts
export const zodWeaverConfig = ZodWeaver.config({
  presetGraphQLType: (schema) => {
    if (schema instanceof z.ZodDate) return GraphQLDateTime
    if (schema instanceof z.ZodAny) return GraphQLJSON
    if (schema instanceof z.ZodRecord) return GraphQLJSONObject
  },
})
```

**核心实现**：
```typescript
// packages/zod/src/index.ts
const preset = weaverContext.getConfig<ZodWeaverConfig>("gqloom.zod")
const presetType = preset?.presetGraphQLType?.(schema)
if (presetType) return presetType
```

**结论**：内置支持，可通过 `presetGraphQLType` 配置自定义标量类型，可集成 `graphql-scalars` 等库，API 直观且类型安全。

### 4.5 订阅（Subscription）

**评分：✅ 内置支持**

**实现方式**：
- **原生支持 Subscriptions**：通过 `subscription()` 工厂函数创建订阅
- **支持 AsyncIterator**：支持生成器函数和 AsyncIterator
- **支持 PubSub**：可以与 `graphql-yoga` 的 `createPubSub` 集成

**实际使用证据**：
```typescript
// examples/subscriptions/src/zod.ts
const CountdownResolver = resolver({
  countdown: subscription(z.number())
    .input({ seconds: z.number().int() })
    .subscribe(async function* (data) {
      for (let i = data.seconds; i >= 0; i--) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        yield i
      }
    }),
})

const HelloResolver = resolver({
  listenGreeting: subscription(z.string())
    .subscribe(() => pubSub.subscribe("greeting"))
    .resolve((payload) => payload),
})
```

**核心实现**：
```typescript
// packages/core/src/resolver/resolver.ts
export const subscription: SubscriptionFactoryWithChain = Object.assign(
  createSubscription as unknown as SubscriptionFactory,
  SubscriptionChainFactory.methods()
)
```

**结论**：原生支持 GraphQL Subscriptions，支持实时数据推送，底层传输协议兼容性好（WebSocket, SSE 等），API 简洁。

### 4.6 上下文（Context）注入

**评分：✅ 内置支持**

**实现方式**：
- **原生支持 Context 注入**：通过 `useContext()`、`createContext()`、`createMemoization()` 等 API
- **类型推导完善**：Context 类型自动推导，IDE 提示良好
- **支持依赖注入**：通过 `InjectableContext` 和 `ContextMemoization` 实现依赖注入

**实际使用证据**：
```typescript
// examples/middlewares/src/context/index.ts
export const useUser = createMemoization(async () => {
  const randomUser = users[Math.floor(Math.random() * users.length)]
  return randomUser
})

// 在 Resolver 中使用
.resolve(async ({ next, parseInput }) => {
  const user = await useUser()  // 自动从 Context 获取
  // ...
})
```

**核心实现**：
```typescript
// packages/core/src/context/context.ts
export function useContext<TContextType = object>(): TContextType {
  return useResolverPayload()?.context as TContextType
}

export function createContext<T>(
  ...args: ConstructorParameters<typeof InjectableContext<T>>
): CallableContext<T> {
  // ...
}
```

**结论**：原生支持在 Resolver 中注入上下文，上下文的类型推导完善，IDE 提示良好，无需手动类型声明。

### 4.7 中间件（Middleware）

**评分：✅ 内置支持**

**实现方式**：
- **原生支持中间件**：通过 `.use()` 方法链式调用中间件
- **支持按操作类型过滤**：可以指定中间件应用于哪些操作类型
- **支持链式调用**：可以链式添加多个中间件

**实际使用证据**：
```typescript
// examples/middlewares/src/zod-posts.ts
createPost: mutation(Post)
  .input(/* ... */)
  .use(async ({ next, parseInput }) => {
    const inputResult = await parseInput.getResult()
    inputResult.authorId = (await useUser()).id
    parseInput.result = { value: inputResult }
    return next()
  })
  .resolve(({ title, content, authorId }) => {
    // ...
  })

// 全局中间件
const schema = weave(ZodWeaver, zodWeaverConfig, userResolver)
  .use(authGuard("admin"))  // 全局应用
```

**核心实现**：
```typescript
// packages/core/src/utils/middleware.ts
export interface Middleware<TField extends Loom.BaseField = any> {
  (options: CallableMiddlewareOptions<TField>): MayPromise<...>
  operations?: MiddlewareOperation[]
}
```

**结论**：原生支持在 Resolver 执行前后注入中间件逻辑（如日志记录、权限检查、性能监控），API 简洁，支持链式调用。

### 4.8 查询复杂度分析（Query Complexity）

**评分：⚠️ 插件/额外实现**

**实现方式**：
- **不内置复杂度计算**：GQLoom 本身不提供复杂度计算逻辑
- **支持通过 Extensions 声明复杂度**：可以通过 `.extensions({ complexity: ... })` 声明复杂度
- **需要配合第三方库**：需要配合 `graphql-query-complexity` 等库使用

**实际使用证据**：
```typescript
// examples/query-complexity/src/zod.ts
posts: query(z.array(Post))
  .extensions({
    complexity: (args: ComplexityEstimatorArgs) => {
      return args.childComplexity * (args.args.limit ?? 10)
    },
  })
  .resolve(() => [])

// 字段级别
description: z.string().register(asField, { complexity: 2 })
```

**结论**：不内置支持，但可通过 Extensions 声明复杂度，需要配合 `graphql-query-complexity` 等库实现复杂度分析，需要额外配置。

### 4.9 深度限制（Depth Limiting）

**评分：⚠️ 插件/额外实现**

**实现方式**：
- **不内置深度限制**：GQLoom 本身不提供深度限制功能
- **需要通过 Server 中间件实现**：需要通过 GraphQL Server 的中间件或插件实现（如 `graphql-depth-limit`）

**结论**：不内置支持，需要通过 GraphQL Server 的中间件或插件实现深度限制，需要额外配置。

### 内置功能总结

| 功能                           | 支持情况        | 得分 |
| :----------------------------- | :-------------- | :--- |
| **指令支持（Directives）**     | ⚠️ 插件/额外实现 | 2/5  |
| **扩展支持（Extensions）**     | ✅ 内置支持      | 5/5  |
| **批量加载（DataLoader）**     | ✅ 内置支持      | 5/5  |
| **自定义标量（Scalars）**      | ✅ 内置支持      | 5/5  |
| **订阅（Subscription）**       | ✅ 内置支持      | 5/5  |
| **上下文（Context）注入**      | ✅ 内置支持      | 5/5  |
| **中间件（Middleware）**       | ✅ 内置支持      | 5/5  |
| **查询复杂度分析**             | ⚠️ 插件/额外实现 | 2/5  |
| **深度限制（Depth Limiting）** | ⚠️ 插件/额外实现 | 2/5  |

**综合评分：4.1/5（加权平均）**

GQLoom 在核心功能（Context、Middleware、DataLoader、Subscriptions、Extensions、自定义标量）方面提供了优秀的原生支持，但在 Directives 定义、查询复杂度分析和深度限制方面需要通过插件或第三方库实现。整体而言，内置功能丰富且与核心 API 深度集成。

## 5. 生态集成 (Ecosystem Integration)

### 生态集成概述

GQLoom 通过官方插件系统实现了与 TypeScript 生态中主流工具的深度集成，包括 ORM（Prisma、Drizzle、MikroORM）、验证库（Zod、Valibot、Yup）等。所有集成都通过 Weaver 插件系统实现，类型完全同步，零样板代码。GraphQL Server 兼容性方面，GQLoom 与标准 GraphQL.js 完全兼容，可以集成到任何 GraphQL Server 和 Web 框架。

**核心集成位置**：
- `packages/prisma/`：Prisma ORM 集成
- `packages/drizzle/`：Drizzle ORM 集成
- `packages/mikro-orm/`：MikroORM 集成
- `packages/zod/`、`packages/valibot/`、`packages/yup/`：验证库集成
- `examples/adapters/`：GraphQL Server 和 Web 框架适配示例

### 5.1 ORM 集成深度（ORM Integration Depth）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**实现方式**：
- **深度整合**：提供官方插件直接复用 ORM 模型定义，自动生成高效的数据库查询，类型完全同步，零样板代码
- **支持主流 ORM**：Prisma、Drizzle、MikroORM 都有官方插件支持
- **Resolver Factory**：提供 Resolver Factory 快速创建 CRUD 接口

**Prisma 集成**：
```typescript
// examples/prisma/src/index.ts
import { PrismaResolverFactory } from "@gqloom/prisma"
import { User, Post } from "./generated/gqloom"

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(userResolver, postResolver)
```

**Drizzle 集成**：
```typescript
// examples/drizzle/src/schema.ts
import { drizzleSilk } from "@gqloom/drizzle"

export const users = drizzleSilk(
  t.pgTable("users", {
    id: t.serial().primaryKey(),
    email: t.text().unique().notNull(),
    name: t.text(),
  })
)

// examples/cattery-zod/src/resolvers/cat.ts
const catResolverFactory = drizzleResolverFactory(db, "cats")

export const catResolver = resolver.of(cats, {
  cats: catResolverFactory.selectArrayQuery(),
  owner: catResolverFactory.relationField("owner"),
  createCats: catResolverFactory.insertArrayMutation({ /* ... */ }),
})
```

**MikroORM 集成**：
- 支持使用 MikroORM 的 Entity Schema 作为 Silk
- 支持从 Entity Schema 生成 GraphQL 操作

**核心特性**：
- **类型完全同步**：ORM 模型类型自动同步到 GraphQL Schema
- **零样板代码**：通过 Resolver Factory 快速创建 CRUD 接口
- **支持自定义输入和中间件**：可以在 Resolver Factory 上添加自定义输入和中间件

**结论**：深度整合。提供官方插件直接复用 ORM 模型定义（如 Prisma, Drizzle, MikroORM），自动生成高效的数据库查询，类型完全同步，零样板代码。

### 5.2 验证库集成（Validation Library Integration）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**实现方式**：
- **无缝集成**：原生支持主流验证库（Zod, Valibot, Yup），验证逻辑与 Schema 定义完全合一
- **从验证规则自动推导类型**：TypeScript 类型和 GraphQL 类型都从验证规则自动推导
- **零配置**：无需额外配置，直接使用验证库的 Schema 定义

**Zod 集成**：
```typescript
// src/schema.ts
import { ZodWeaver } from '@gqloom/zod'
import * as z from 'zod'

export const Food = z.object({
  id: z.int(),
  name: z.string(),
  price: z.number(),
})

export const schema = weave(ZodWeaver, zodWeaverConfig, menuResolver)
```

**Valibot 集成**：
```typescript
// examples/cattery-valibot/src/resolvers/cat.ts
import { ValibotWeaver } from "@gqloom/valibot"
import * as v from "valibot"

const Cat = v.object({
  id: v.number(),
  name: v.string(),
})

export const schema = weave(ValibotWeaver, catResolver)
```

**Yup 集成**：
- 提供 `@gqloom/yup` 包，支持 Yup Schema 集成

**核心特性**：
- **验证逻辑与 Schema 定义完全合一**：Zod/Valibot/Yup Schema 既是验证规则，也是 GraphQL Schema 定义
- **类型自动推导**：通过 `z.infer<typeof Schema>` 自动推导 TypeScript 类型
- **零配置**：无需额外配置，直接使用验证库的 API

**结论**：无缝集成。原生支持主流验证库（Zod, Valibot, Yup 等），验证逻辑与 Schema 定义完全合一，从验证规则自动推导类型，零配置。

### 5.3 GraphQL Server 兼容性（Server Compatibility）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**实现方式**：
- **完全兼容**：与标准 GraphQL.js 完全兼容，可以集成到任何 GraphQL Server
- **官方示例**：提供了与主流 GraphQL Server 的集成示例
- **零配置**：直接传入 `GraphQLSchema` 实例即可使用

**Apollo Server 集成**：
```typescript
// examples/adapters/src/apollo.ts
import { ApolloServer } from "@apollo/server"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
const server = new ApolloServer({ schema })
```

**GraphQL Yoga 集成**：
```typescript
// examples/adapters/src/yoga.ts
import { createYoga } from "graphql-yoga"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
const yoga = createYoga({ schema })
```

**Mercurius 集成**：
```typescript
// examples/adapters/src/mercurius.ts
import mercurius from "mercurius"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
app.register(mercurius, { schema })
```

**Hono GraphQL Server 集成**：
```typescript
// examples/adapters/src/hono.ts
import { graphqlServer } from "@hono/graphql-server"
import { weave } from "@gqloom/core"

const schema = weave(helloResolver)
app.use("/graphql", graphqlServer({ schema, graphiql: true }))
```

**核心特性**：
- **标准 GraphQL.js 兼容**：生成的 `GraphQLSchema` 实例与标准 GraphQL.js 完全兼容
- **零配置**：无需额外适配器，直接使用标准 GraphQL Server API
- **支持所有主流 Server**：Apollo Server、GraphQL Yoga、Mercurius、Hono 等

**结论**：完全兼容。与所有主流 GraphQL Server（Apollo Server, GraphQL Yoga, Envelop, Hono 等）完全兼容，提供官方适配器示例，零配置即可使用。

### 5.4 Web 框架适配（Web Framework Adapter）

**评分：⭐⭐⭐⭐⭐ (5/5)**

**实现方式**：
- **全框架支持**：通过标准 GraphQL Server 可以集成到任何 Web 框架
- **官方示例**：提供了与主流 Web 框架的集成示例
- **类型安全**：集成过程类型安全

**Hono 集成**：
```typescript
// examples/adapters/src/hono.ts
import { graphqlServer } from "@hono/graphql-server"
import { Hono } from "hono"

const schema = weave(helloResolver)
app.use("/graphql", graphqlServer({ schema, graphiql: true }))
```

**Fastify 集成**（通过 Mercurius）：
```typescript
// examples/adapters/src/mercurius.ts
import Fastify from "fastify"
import mercurius from "mercurius"

const schema = weave(helloResolver)
app.register(mercurius, { schema })
```

**Express/Next.js/Koa 集成**：
- 可以通过 Apollo Server、GraphQL Yoga 等标准 GraphQL Server 集成
- 所有标准 GraphQL Server 都支持 Express、Next.js、Koa 等框架

**Context 注入示例**：
```typescript
// examples/adapters/src/contexts/yoga.ts
import { useContext } from "@gqloom/core/context"
import type { YogaInitialContext } from "graphql-yoga"

export function useAuthorization() {
  return useContext<YogaInitialContext>().request.headers.get("Authorization")
}
```

**核心特性**：
- **标准集成**：通过标准 GraphQL Server 集成到 Web 框架，无需特殊适配器
- **类型安全**：Context 类型可以自动推导，IDE 提示完善
- **支持所有主流框架**：Express、Fastify、Next.js、Hono、Koa 等

**结论**：全框架支持。通过标准 GraphQL Server 可以集成到任何 Web 框架（Express, Fastify, Next.js, Hono, Koa 等），集成简单，类型安全。

### 生态集成总结

| 评估项                    | 得分  | 说明                                                                  |
| :------------------------ | :---- | :-------------------------------------------------------------------- |
| **ORM 集成深度**          | ⭐⭐⭐⭐⭐ | 深度整合，提供官方插件直接复用 ORM 模型定义，类型完全同步，零样板代码 |
| **验证库集成**            | ⭐⭐⭐⭐⭐ | 无缝集成，原生支持主流验证库，验证逻辑与 Schema 定义完全合一，零配置  |
| **GraphQL Server 兼容性** | ⭐⭐⭐⭐⭐ | 完全兼容，与所有主流 GraphQL Server 兼容，提供官方适配器示例，零配置  |
| **Web 框架适配**          | ⭐⭐⭐⭐⭐ | 全框架支持，通过标准 GraphQL Server 可以集成到任何 Web 框架，类型安全 |

**综合评分：5/5**

GQLoom 的生态集成能力优秀，通过官方插件系统实现了与主流 ORM 和验证库的深度整合，类型完全同步，零样板代码。GraphQL Server 兼容性和 Web 框架适配方面，通过标准 GraphQL.js 实现了完全兼容，可以集成到任何框架。

## 📝 总结

### 综合评估

GQLoom 是一个设计优秀的 Code-First GraphQL Schema 构建库，通过 Weaving（编织）模式实现了"零魔法、零依赖"的轻量级架构。在 5 个核心评估维度中，GQLoom 表现如下：

**优势**：
1. **极简架构**：仅依赖 `graphql` 标准库，纯运行时构建，不使用装饰器或反射元数据
2. **深度类型推断**：Zod Schema 作为单一数据源，同时用于 TypeScript 类型、运行时验证和 GraphQL Schema
3. **优秀的开发体验**：链式 API 设计，代码极简，几乎无样板代码
4. **原生功能支持**：Context、Middleware、DataLoader、Subscriptions 等核心功能原生支持
5. **强大的生态集成**：与主流 ORM（Prisma、Drizzle、MikroORM）和验证库（Zod、Valibot、Yup）深度整合

**待改进**：
1. **接口继承**：需要显式调用 `.register(asObjectType, { interfaces: [Food] })` 声明接口关系
2. **Directives 定义**：不内置自定义 Directives 定义，需要通过插件实现
3. **查询复杂度分析**：不内置计算逻辑，需要配合第三方库使用

### 适用场景

GQLoom 特别适合以下场景：
- **运行时类型优先**：项目已使用 Zod、Valibot 或 Yup 进行验证
- **ORM 深度集成**：使用 Prisma、Drizzle 或 MikroORM 的项目
- **零魔法要求**：不希望使用装饰器或反射元数据的项目
- **快速开发**：需要快速构建 GraphQL API，减少样板代码

### 最终评分

| 维度                | 得分 | 权重 | 加权得分 |
| :------------------ | :--- | :--- | :------- |
| **1. 架构模式**     | 5/5  | 25%  | 1.25     |
| **2. 类型定义**     | 4/5  | 25%  | 1.00     |
| **3. 解析器与验证** | 5/5  | 25%  | 1.25     |
| **4. 内置功能**     | 4/5  | 15%  | 0.60     |
| **5. 生态集成**     | 5/5  | 10%  | 0.50     |

**总分：4.60/5.00（92%）**

GQLoom 是一个设计优秀、功能完善的 GraphQL Schema 构建库，特别适合需要深度集成运行时类型和 ORM 的项目。其"零魔法、零依赖"的设计理念和强大的生态集成能力使其成为 TypeScript GraphQL 开发的优秀选择。

