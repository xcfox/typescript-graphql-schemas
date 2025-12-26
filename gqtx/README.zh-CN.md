# GQTX 评估报告

## 📋 基本信息

- **官网**: 无（仅 GitHub 仓库）
- **仓库地址**: [https://github.com/sikanhe/gqtx](https://github.com/sikanhe/gqtx)
- **首次 Release**: 2019-10-14 (v0.1.0)
- **最新 Release**: 2023-12-05 (v0.9.3)

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 7 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 1. 架构模式

**评估结果：Builder（构建器）模式**

GQTX 采用典型的 **Builder（构建器）模式**，通过函数式 API 显式构建类型定义。

#### 实现方式

- **类型定义**：使用 `Gql.Object<T>()`、`Gql.Field()`、`Gql.Enum()` 等函数式 API 定义类型
  ```typescript
  export const UserType = Gql.Object<User>({
    name: 'User',
    fields: () => [
      Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
      Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
      Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
    ],
  })
  ```
- **Schema 构建**：通过 `buildGraphQLSchema()` 组装最终的可执行 GraphQL Schema
  ```typescript
  export const schema = buildGraphQLSchema({
    query: Query,
    mutation: Mutation,
  })
  ```

#### 优势

- ✅ **无运行时反射**：不依赖反射元数据，运行时开销小
- ✅ **代码纯净**：纯函数式 API，易于测试和调试
- ✅ **模块化构建**：Schema 定义和 Resolver 可以分离，支持大型项目的模块化组织
- ✅ **轻量级**：API 简洁，学习曲线平缓

#### 劣势

- ⚠️ **类型安全不足**：大量使用 `unknown` 类型和类型断言，类型推断不够完善
- ⚠️ **显式定义**：需要手动定义每个字段，代码量较多
- ⚠️ **类型重复**：TypeScript 类型定义和 GraphQL Schema 定义需要分别维护

**代码示例**：
```typescript
// gqtx/src/resolvers/types.ts (lines 77-92)
export const UserType = Gql.Object<User>({
  name: 'User',
  description: 'User information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
    Gql.Field({
      name: 'orders',
      type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
      resolve: (user) => {
        return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
      },
    }),
  ],
})
```

```typescript
// gqtx/src/schema.ts (lines 25-28)
export const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
})
```

```typescript
// gqtx/src/schema.ts (lines 9-15)
const Query = Gql.Query({
  fields: () =>
    ([...userQueryFields, ...menuQueryFields, ...orderQueryFields] as FieldArray) as [
      Field<unknown, unknown>,
      ...Field<unknown, unknown>[],
    ],
})
```

---

### 2. 依赖复杂度

**评估结果：依赖较少，轻量级**

#### 核心依赖

- `gqtx` - 核心库
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
// gqtx/package.json (lines 10-16)
  "dependencies": {
    "@coffee-shop/shared": "workspace:*",
    "gqtx": "^0.9.0",
    "graphql": "^16.12.0",
    "graphql-scalars": "^1.25.0",
    "graphql-yoga": "^5.18.0"
  }
```

---

### 3. 类型定义

**评估结果：支持完整，但类型安全不足**

#### 对象类型

使用 `Gql.Object<T>()` 定义对象类型，需要手动定义每个字段：

```typescript
// gqtx/src/resolvers/types.ts (lines 77-92)
export const UserType = Gql.Object<User>({
  name: 'User',
  description: 'User information',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
    Gql.Field({
      name: 'orders',
      type: Gql.NonNull(Gql.List(Gql.NonNull(OrderType))),
      resolve: (user) => {
        return Array.from(orderMap.values()).filter((o) => o.userId === user.id)
      },
    }),
  ],
})
```

- ⚠️ **类型安全不足**：虽然使用了泛型 `Gql.Object<User>`，但字段定义与 TypeScript 类型之间缺乏编译时检查
- ⚠️ **类型重复**：需要同时维护 TypeScript 类型定义（如 `type User`）和 GraphQL Schema 定义

#### 联合类型 (Union)

支持 Union 类型定义，但需要手动实现 `resolveType`：

```typescript
// gqtx/src/resolvers/types.ts (lines 133-140)
export const MenuItemType = Gql.Union({
  name: 'MenuItem',
  description: 'Menu item union type',
  types: [CoffeeType, DessertType],
  resolveType: (value: MenuItem) => {
    return value.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})
```

- ✅ **支持内联片段**：完全支持 GraphQL 内联片段查询
- ⚠️ **手动实现**：需要手动实现 `resolveType` 函数，依赖 `__typename` 字段
- ⚠️ **类型安全不足**：`resolveType` 的返回值类型需要手动维护

#### 接口 (Interface)

支持 Interface 定义和实现：

```typescript
// gqtx/src/resolvers/types.ts (lines 95-103)
export const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  description: 'Food interface with common fields',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})
```

```typescript
// gqtx/src/resolvers/types.ts (lines 106-117)
export const CoffeeType = Gql.Object<Coffee>({
  name: 'Coffee',
  description: 'Coffee menu item',
  interfaces: [FoodInterface],
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})
```

- ✅ **支持接口实现**：通过 `interfaces` 数组实现接口
- ⚠️ **需要重复定义**：接口字段需要在实现类型中重复定义（id、name、price），无法自动继承

#### 枚举类型 (Enum)

使用 `Gql.Enum()` 定义枚举，需要手动定义 values：

```typescript
// gqtx/src/resolvers/types.ts (lines 12-21)
export const SugarLevelEnum = Gql.Enum({
  name: 'SugarLevel',
  description: 'Sugar level for coffee',
  values: [
    { name: 'NONE', value: 'NONE' },
    { name: 'LOW', value: 'LOW' },
    { name: 'MEDIUM', value: 'MEDIUM' },
    { name: 'HIGH', value: 'HIGH' },
  ],
})
```

- ⚠️ **手动定义**：需要手动定义每个枚举值，无法直接复用 TypeScript 枚举或 `as const` 对象
- ⚠️ **类型不同步**：TypeScript 枚举类型（如 `type Coffee['sugarLevel']`）和 GraphQL 枚举定义需要分别维护，容易出现不同步问题

#### 类型推断

- ❌ **不支持类型推断**：无法从 Schema 定义自动推断 TypeScript 类型
- ❌ **单一数据源缺失**：TypeScript 类型定义和 GraphQL Schema 定义需要分别维护，容易出现不同步问题

---

### 4. 解析器定义

**评估结果：模块化组织良好，但类型安全不足**

#### Resolver 定义方式

使用 `Gql.Field()` 定义字段和 resolver，类型定义和 resolver 可以分离：

```typescript
// gqtx/src/resolvers/user.ts (lines 7-24)
export const userQueryFields = [
  Gql.Field({
    name: 'users',
    type: Gql.NonNull(Gql.List(Gql.NonNull(UserType))),
    resolve: () => Array.from(userMap.values()),
  }),
  Gql.Field({
    name: 'user',
    type: UserType,
    args: {
      id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    },
    resolve: (_, { id }) => {
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  }),
]
```

- ✅ **模块化组织**：支持按领域模块化组织（user、menu、order）
- ✅ **高内聚**：每个模块包含完整的 Query、Mutation 和关联 Resolver
- ⚠️ **类型安全不足**：参数和返回值类型需要手动维护，缺乏编译时类型检查

#### Schema 组装

在 `schema.ts` 中统一组装所有模块：

```typescript
// gqtx/src/schema.ts (lines 9-15)
const Query = Gql.Query({
  fields: () =>
    ([...userQueryFields, ...menuQueryFields, ...orderQueryFields] as FieldArray) as [
      Field<unknown, unknown>,
      ...Field<unknown, unknown>[],
    ],
})
```

- ⚠️ **类型断言**：需要使用 `as` 类型断言，使用了 `unknown` 类型，失去了类型安全
- ✅ **易于维护**：业务逻辑与 Schema 定义分离，支持大型项目的模块化组织

#### 关联查询

支持在类型定义中直接定义关联字段的 resolver：

```typescript
// gqtx/src/resolvers/types.ts (lines 151-170)
Gql.Field({
  name: 'user',
  type: Gql.NonNull(UserType),
  resolve: (order) => {
    const user = userMap.get(order.userId)
    if (!user) throw new Error('User not found')
    return user
  },
}),
Gql.Field({
  name: 'items',
  type: Gql.NonNull(Gql.List(Gql.NonNull(MenuItemType))),
  resolve: (order) => {
    return order.itemIds.map((id) => {
      const item = menuItemMap.get(id)
      if (!item) throw new Error(`Menu item ${id} not found`)
      return item
    })
  },
}),
```

- ✅ **支持关联查询**：可以方便地定义关联字段的 resolver
- ⚠️ **类型安全不足**：parent 参数类型（如 `order`）需要手动维护，缺乏编译时类型检查

---

### 5. 输入验证与参数定义

**评估结果：参数定义清晰，验证需要手动实现**

#### 参数定义

使用 `Gql.Arg()` 定义参数，支持可选参数：

```typescript
// gqtx/src/resolvers/user.ts (lines 27-42)
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {
    if (!email.includes('@')) throw new GraphQLError('Invalid email format')
    const id = incrementId()
    const newUser: User = { id, name, email }
    userMap.set(id, newUser)
    return newUser
  },
}),
```

```typescript
// gqtx/src/resolvers/user.ts (lines 43-61)
Gql.Field({
  name: 'updateUser',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    name: Gql.Arg({ type: Gql.String }),
    email: Gql.Arg({ type: Gql.String }),
  },
  resolve: (_, { id, name, email }) => {
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    if (name !== undefined && name !== null) user.name = name
    if (email !== undefined && email !== null) {
      if (!email.includes('@')) throw new GraphQLError('Invalid email format')
      user.email = email
    }
    return user
  },
}),
```

- ✅ **参数定义清晰**：使用 `Gql.Arg()` 定义参数，支持可选参数（不传 `Gql.NonNullInput` 即为可选）
- ⚠️ **类型推导不足**：参数类型需要手动定义，缺乏自动类型推导，IDE 提示不够完善

#### 格式验证

验证逻辑需要在 resolve 函数中手动实现：

```typescript
// gqtx/src/resolvers/user.ts (line 36)
if (!email.includes('@')) throw new GraphQLError('Invalid email format')
```

- ⚠️ **手动验证**：需要在 resolver 中手动编写验证逻辑
- ⚠️ **无法复用**：验证逻辑无法复用，容易出现重复代码
- ⚠️ **无声明式验证**：不支持声明式验证，需要过程式 `if-throw` 逻辑

#### 自定义验证

复杂业务逻辑验证需要在 resolver 中手动实现：

```typescript
// gqtx/src/resolvers/order.ts (lines 35-40)
resolve: (_, { userId, items }) => {
  if (items.length === 0) throw new GraphQLError('At least one item is required')
  if (!userMap.has(userId)) throw new GraphQLError('User not found')
  for (const itemId of items) {
    if (!menuItemMap.has(itemId)) throw new GraphQLError(`Menu item not found`)
  }
  // ...
}
```

- ⚠️ **手动实现**：所有业务验证都需要在 resolver 中手动实现
- ⚠️ **无验证框架集成**：不支持与 Zod、Valibot、Yup 等验证库集成
- ⚠️ **代码冗长**：验证逻辑与业务逻辑混合，代码可读性较差

#### 评估

- ✅ **参数定义清晰**：使用 `Gql.Arg()` 定义参数，API 直观
- ⚠️ **类型推导不足**：缺乏完整的类型推导能力，IDE 提示不够完善
- ❌ **验证能力弱**：不支持声明式验证，无法与验证库集成，验证逻辑需要手动实现

---

### 6. 内置功能

**评估结果：核心功能支持，高级功能缺失**

#### 上下文 (Context)

支持在 Resolver 中注入上下文，并通过 TypeScript 模块声明实现类型推导。这是 gqtx 的一个亮点功能。

**实现方式**：
根据文档，可以通过 `declare module "gqtx"` 扩展 `GqlContext` 接口：

```typescript
declare module "gqtx" {
  interface GqlContext {
    viewerId: number;
    users: User[];
  }
}

const Query = Gql.Query({
  fields: [
    Gql.Field({
      name: 'userById',
      type: UserType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
      },
      resolve: (_, args, ctx) => {
        // `ctx` 自动推断为 { viewerId: number, users: User[] }
        const user = ctx.users.find((u) => u.id === args.id);
        return user;
      },
    }),
  ],
});
```

**文档参考**：[Getting Started | GQTX](https://github.com/sikanhe/gqtx#getting-started)

- ✅ **类型推导**：通过 TypeScript 模块声明实现上下文类型推导，所有 resolver 自动推断
- ✅ **全局定义**：上下文类型只需定义一次，无需在每个 resolver 中重复声明
- ✅ **类型安全**：编译时确保上下文类型正确
- ⚠️ **实际使用**：当前示例代码中未使用 context，但 API 支持

#### 自定义标量 (Scalars)

支持定义自定义标量类型，可以集成第三方标量库。

**实现方式**：
```typescript
// gqtx/src/resolvers/types.ts (lines 5-10)
export const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})
```

- ✅ **易于定义**：通过 `Gql.Scalar()` 简洁定义
- ✅ **灵活集成**：可以集成第三方标量库（如 `graphql-scalars`）
- ⚠️ **类型安全**：标量类型需要手动维护，缺乏自动类型推导

#### 批量加载 (Batching)

- ❌ **无原生支持**：文档和代码中未看到 DataLoader 的原生集成
- ⚠️ **可手动实现**：可以通过 context 手动集成 DataLoader，但缺乏官方支持
- ⚠️ **无文档说明**：未看到解决 N+1 查询问题的官方方案

#### 订阅 (Subscription)

- ❓ **未明确支持**：文档中未看到 GraphQL Subscriptions 的相关说明
- ⚠️ **可能支持**：由于 gqtx 生成标准的 `graphql-js` schema，理论上可以支持订阅，但缺乏文档和示例
- ⚠️ **无示例代码**：示例代码中未包含订阅相关的实现

#### Directives 和 Extensions

- ❓ **未明确支持**：文档中未明确提及 GraphQL Directives 的支持情况
- ❓ **Extensions**：文档中未明确提及 GraphQL Extensions 的支持情况
- ❓ **查询复杂度**：未看到声明查询复杂度的相关文档

#### 中间件 (Middleware)

- ❌ **无官方支持**：文档中未看到 Resolver 中间件的相关 API
- ⚠️ **可能通过 Context 实现**：可以通过 Context 注入中间件逻辑，但缺乏官方中间件 API
- ⚠️ **无文档说明**：未看到在解析过程中注入额外逻辑（如日志记录、权限检查）的官方方案

#### 联邦架构 (Federation)

- ❌ **未支持**：文档中未提及 GraphQL Federation 的支持

#### 扩展机制

- ❌ **无插件系统**：缺乏灵活的插件系统来扩展功能
- ⚠️ **基于 graphql-js**：由于生成标准的 `graphql-js` schema，可以通过标准 GraphQL 扩展机制扩展

#### 总结

- ✅ **核心功能支持**：上下文、自定义标量等核心功能有良好支持
- ✅ **类型安全**：上下文类型推导是亮点，通过 TypeScript 模块声明实现全局类型推导
- ❌ **高级功能缺失**：批量加载、订阅、Directives、中间件等高级功能缺乏官方支持或文档
- ⚠️ **文档可改进**：许多功能的支持情况需要更明确的文档说明

---

### 7. 生态集成

**评估结果：Server 兼容性优秀，验证库和 ORM 集成待完善**

#### Server 兼容性

GQTX 对主流 GraphQL Server 有优秀的兼容性支持。

**支持的 Server**：
根据文档示例，gqtx 可以与任何标准的 GraphQL Server 集成：

- ✅ **express-graphql**：文档示例中使用
- ✅ **GraphQL Yoga**：示例代码中使用
- ✅ **Apollo Server**：理论上支持（生成标准 `graphql-js` schema）

**实现方式**：
```typescript
// gqtx/src/server.ts (lines 6-8)
const yoga = createYoga({ schema })
const server = createServer(yoga)
```

文档示例（express-graphql）：
```typescript
import express from 'express';
import graphqlHTTP from 'express-graphql';

const app = express();
app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);
```

- ✅ **无服务器绑定**：gqtx 本身不绑定特定服务器，可以自由选择
- ✅ **易于集成**：通过 `buildGraphQLSchema()` 生成的 Schema 可以用于任何 GraphQL Server
- ✅ **标准兼容**：生成标准的 `graphql-js` schema，兼容性极佳

#### 验证库集成

- ❌ **无官方支持**：文档中未看到与 Zod、Valibot、Yup 等验证库的集成示例
- ⚠️ **可手动实现**：可以在 resolver 中手动使用验证库，但缺乏深度集成
- ⚠️ **无自动类型推导**：无法直接从验证库 Schema 自动推导 GraphQL 类型
- ⚠️ **无单一数据源**：验证逻辑、类型定义和 GraphQL Schema 需要分别维护

#### ORM 集成

- ❌ **未明确支持**：文档中未看到与 Prisma、Drizzle、TypeORM 等 ORM 的深度整合
- ❌ **缺乏官方插件**：未看到类似 Pothos Prisma 插件的官方 ORM 集成方案
- ⚠️ **需要手动集成**：需要手动编写 Resolver 来连接 ORM，缺乏自动化支持
- ⚠️ **无 ResolverFactory**：未提供快速生成 CRUD 接口的工具

#### Web 框架集成

- ✅ **Express**：文档示例中使用 express-graphql
- ✅ **Node.js HTTP**：示例代码中使用原生 Node.js HTTP 服务器
- ❓ **其他框架**：未明确看到 Next.js、Hono、Fastify 等框架的集成文档

#### 客户端集成

- ✅ **标准 GraphQL**：生成标准的 GraphQL Schema，可以与任何 GraphQL 客户端集成
- ❓ **特定客户端**：未明确看到 Apollo Client、urql、GQty 等特定客户端的集成文档

#### 总结

- ✅ **Server 兼容性优秀**：支持主流 GraphQL Server，无服务器绑定，兼容性极佳
- ⚠️ **验证库集成待完善**：缺乏官方验证库集成方案，需要手动实现
- ❌ **ORM 集成缺失**：缺乏官方 ORM 集成方案，需要手动编写 Resolver
- ✅ **标准兼容**：基于标准 `graphql-js`，可以与整个 GraphQL 生态集成

**参考链接**：
- [GQTX GitHub](https://github.com/sikanhe/gqtx)
- [GQTX 设计理念 (WHY.md)](https://github.com/sikanhe/gqtx/blob/master/WHY.md)
