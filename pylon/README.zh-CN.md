# Pylon 评估报告

## 📋 基本信息

- **官网**: [https://pylon.cronit.io](https://pylon.cronit.io)
- **仓库地址**: [https://github.com/getcronit/pylon](https://github.com/getcronit/pylon)
- **首次 Release**: 2024-05-24 (v0.0.86)
- **最新 Release**: 2025-12-15 (v2.9.6)

## 📐 对比维度解析

在评估 GraphQL Schema 构建库时，我们主要关注以下 7 个核心技术维度。这些维度直接影响开发者的编码体验（DX）、代码的可维护性以及运行时的性能。

### 1. 架构模式

**评估结果：Inference（自动推断）模式**

Pylon 采用典型的 **Inference（自动推断）模式**，通过静态分析 TypeScript 代码自动生成 GraphQL Schema，无需显式的 Schema 定义。开发者只需编写普通的 TypeScript 类和函数，Pylon 会在构建时（`pylon build`）自动推断并生成 GraphQL Schema。

#### 实现方式

- **类型定义**：直接使用 TypeScript 类、接口、类型别名定义领域模型
- **Resolver 定义**：定义普通的 TypeScript 函数，通过 `export const graphql` 导出 Query 和 Mutation
- **关联查询**：通过类方法实现关联查询（如 `User.orders()`）
- **Schema 生成**：通过 `pylon build` 命令静态分析代码，自动生成 GraphQL Schema 到 `.pylon/` 目录

**代码示例**：

```typescript
// pylon/src/resolvers/user.ts (lines 32-43)
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}

  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

```typescript
// pylon/src/resolvers/user.ts (lines 45-54)
export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}
```

```typescript
// pylon/src/index.ts (lines 13-24)
export const graphql = {
  Query: {
    ...userQueries,
    ...menuQueries,
    ...orderQueries,
  },
  Mutation: {
    ...userMutations,
    ...menuMutations,
    ...orderMutations,
  },
}
```

#### 优势

- ✅ **零配置**：无需显式定义 Schema，直接使用 TypeScript 类型即可
- ✅ **单一数据源**：TypeScript 类型定义是唯一的数据源，自动生成 GraphQL Schema
- ✅ **类型安全**：充分利用 TypeScript 的类型系统，编译时检查类型
- ✅ **无运行时开销**：Schema 在构建时生成，运行时无额外开销
- ✅ **代码简洁**：代码看起来就像普通的 TypeScript 代码，学习成本低

#### 劣势

- ⚠️ **需要构建步骤**：必须运行 `pylon build` 才能生成 Schema
- ⚠️ **静态分析限制**：依赖静态分析，某些复杂的类型推断可能受限
- ⚠️ **调试困难**：Schema 是自动生成的，调试时需要查看生成的 Schema 文件

---

### 2. 依赖复杂度

**评估结果：依赖极简，核心依赖少**

#### 核心依赖

- `@getcronit/pylon` - 核心库（运行时）
- `graphql` - GraphQL 运行时

#### 开发依赖

- `@getcronit/pylon-dev` - 开发工具（用于构建和生成 Schema）

#### 运行时依赖

- `@hono/node-server` - Hono 服务器（用于运行 GraphQL 服务器）
- `dataloader` - DataLoader 实现（用于批量加载，如果使用 DataLoader 功能）

#### 评估

- ✅ **依赖极简**：核心运行时依赖仅 2 个（`@getcronit/pylon`、`graphql`），加上常用功能依赖共 4 个
- ✅ **无反射元数据**：不依赖反射元数据、类验证器等
- ✅ **无额外验证库**：不需要引入 Zod、Yup 等验证库
- ✅ **轻量级**：整体依赖数量少，安装速度快

**依赖清单**：

```json
// pylon/package.json (lines 13-22)
  "dependencies": {
    "@coffee-shop/shared": "workspace:*",
    "@getcronit/pylon": "^2.4.2",
    "@hono/node-server": "^1.13.7",
    "dataloader": "^2.2.3",
    "graphql": "^16.12.0"
  },
  "devDependencies": {
    "@getcronit/pylon-dev": "^1.0.0"
  }
```

---

### 3. 类型定义

**评估结果：单一数据源，类型推断优秀**

#### 对象类型

直接使用 TypeScript 类定义对象类型，类的公共属性自动映射为 GraphQL 字段：

```typescript
// pylon/src/resolvers/user.ts (lines 32-37)
export class User {
  constructor(
    public id: Int,
    public name: string,
    public email: string,
  ) {}
}
```

```typescript
// pylon/src/resolvers/menu.ts (lines 12-20)
export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}
```

- ✅ **单一数据源**：TypeScript 类是唯一的数据源，自动生成 GraphQL Schema
- ✅ **类型安全**：充分利用 TypeScript 的类型系统
- ✅ **代码简洁**：直接使用 TypeScript 类，无需额外的 Schema 定义

#### 联合类型 (Union)

直接使用 TypeScript 联合类型，Pylon 自动将其转换为 GraphQL Union 类型：

```typescript
// pylon/src/resolvers/menu.ts (line 33)
export type MenuItem = Coffee | Dessert
```

- ✅ **直观定义**：直接使用 TypeScript 联合类型，无需额外配置
- ✅ **自动处理 `__typename`**：需要在数据中手动设置 `__typename` 字段（如 `{ __typename: 'Coffee' }`）
- ✅ **支持内联片段**：完全支持 GraphQL 内联片段查询

#### 接口 (Interface)

直接使用 TypeScript 接口，类通过 `implements` 关键字实现接口：

```typescript
// pylon/src/resolvers/menu.ts (lines 6-10)
export interface Food {
  id: Int
  name: string
  price: number
}
```

```typescript
// pylon/src/resolvers/menu.ts (lines 12-20)
export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}
```

- ✅ **直观的实现方式**：直接使用 TypeScript 的 `implements` 关键字
- ✅ **自动继承公共字段**：接口字段自动继承，无需重复定义
- ✅ **类型安全**：编译时检查接口实现

#### 枚举类型 (Enum)

直接使用 TypeScript 类型别名（字符串联合类型）定义枚举：

```typescript
// pylon/src/resolvers/menu.ts (line 4)
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
```

```typescript
// pylon/src/resolvers/order.ts (line 9)
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

- ✅ **直接映射**：支持直接使用字符串联合类型定义枚举
- ✅ **类型安全**：TypeScript 类型与 GraphQL 枚举自动同步
- ✅ **无需重复定义**：一份定义同时生成 TypeScript 类型和 GraphQL 枚举

#### 类型推断

Pylon 通过静态分析自动推断 GraphQL Schema，TypeScript 类型定义是唯一的数据源：

```typescript
// pylon/src/resolvers/user.ts (lines 45-54)
export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}
```

- ✅ **单一数据源**：TypeScript 类型定义是单一数据源，可以同时生成 GraphQL Schema 和 TypeScript 类型
- ✅ **类型同步**：杜绝类型不同步问题
- ✅ **自动推断**：函数签名自动推断为 GraphQL Query/Mutation

---

### 4. 解析器定义

**评估结果：类型安全，代码简洁**

#### 类型安全的 Resolver

直接定义普通的 TypeScript 函数，函数签名自动推断为 GraphQL Query/Mutation：

```typescript
// pylon/src/resolvers/user.ts (lines 45-54)
export const userQueries = {
  users: (): User[] => {
    return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
  },
  user: (id: Int): User => {
    const u = userMap.get(id)
    if (!u) throw new GraphQLError('User not found')
    return new User(u.id, u.name, u.email)
  },
}
```

- ✅ **完整类型推导**：函数参数和返回值类型自动推断为 GraphQL 类型
- ✅ **编译时检查**：类型不匹配会在编译时报错
- ✅ **代码简洁**：看起来就像普通的 TypeScript 函数

#### 模块化组织

支持将 Resolver 按领域模块化组织：

```typescript
// pylon/src/index.ts (lines 13-24)
export const graphql = {
  Query: {
    ...userQueries,
    ...menuQueries,
    ...orderQueries,
  },
  Mutation: {
    ...userMutations,
    ...menuMutations,
    ...orderMutations,
  },
}
```

- ✅ **高内聚**：每个模块（user、menu、order）包含完整的 Query 和 Mutation
- ✅ **易于维护**：业务逻辑按领域组织，代码清晰
- ✅ **支持 DDD**：适合领域驱动开发的组织方式

#### 关联查询

通过类方法实现关联查询，支持异步加载：

```typescript
// pylon/src/resolvers/user.ts (lines 39-42)
async orders(): Promise<Order[]> {
  const loaders = getContext().get('loaders')
  return loaders.userOrders.load(this.id)
}
```

```typescript
// pylon/src/resolvers/order.ts (lines 57-68)
async user(): Promise<User> {
  const loaders = getContext().get('loaders')
  return loaders.users.load(this.userId)
}

async items(): Promise<MenuItem[]> {
  const loaders = getContext().get('loaders')
  const items = await loaders.menuItems.loadMany(this.itemIds)
  return items.filter(
    (item): item is MenuItem => item instanceof Coffee || item instanceof Dessert,
  )
}
```

- ✅ **类型安全**：关联查询的类型自动推断
- ✅ **支持 DataLoader**：可以轻松集成 DataLoader 进行批量加载
- ✅ **代码直观**：类方法实现关联查询，代码清晰易懂

---

### 5. 输入验证与参数定义

**评估结果：参数定义简洁，验证能力中等**

#### 参数定义

函数参数自动推断为 GraphQL 参数，支持可选参数：

```typescript
// pylon/src/resolvers/user.ts (lines 49-53)
user: (id: Int): User => {
  const u = userMap.get(id)
  if (!u) throw new GraphQLError('User not found')
  return new User(u.id, u.name, u.email)
}
```

```typescript
// pylon/src/resolvers/user.ts (lines 63-71)
updateUser: validateEmailOptional((id: Int, name?: string, email?: string): User => {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  if (name) user.name = name
  if (email) {
    user.email = email
  }
  return new User(user.id, user.name, user.email)
})
```

- ✅ **自动推断**：函数参数自动推断为 GraphQL 参数，提供完整的 IDE 提示
- ✅ **可选参数**：通过 TypeScript 的可选参数（`?`）支持可选参数
- ✅ **代码简洁**：直接使用函数参数，无需额外的配置

#### 格式验证

使用 `createDecorator` 创建验证装饰器，包装 resolver 函数进行验证：

```typescript
// pylon/src/resolvers/user.ts (lines 13-20)
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})
```

```typescript
// pylon/src/resolvers/user.ts (lines 57-62)
createUser: validateEmail((name: string, email: string): User => {
  const id = incrementId()
  const newUser = { id, name, email }
  userMap.set(id, newUser)
  return new User(id, name, email)
})
```

- ⚠️ **需要手动编写验证逻辑**：验证逻辑需要在装饰器中手动编写
- ⚠️ **无内置验证**：不提供内置的格式验证（如邮箱、URL 等），需要自己实现
- ✅ **可复用**：验证装饰器可以复用，支持多个 resolver 共享验证逻辑

#### 自定义验证

使用 `createDecorator` 创建自定义验证装饰器，支持复杂的业务逻辑验证：

```typescript
// pylon/src/resolvers/order.ts (lines 24-45)
const validateCreateOrder = createDecorator(async (userId: Int, items: Int[]) => {
  if (items.length === 0) {
    throw new ServiceError('At least one item is required', {
      code: 'INVALID_ORDER',
      statusCode: 400,
    })
  }
  if (!userMap.has(userId)) {
    throw new ServiceError('User not found', {
      code: 'USER_NOT_FOUND',
      statusCode: 400,
    })
  }
  for (const itemId of items) {
    if (!menuItemMap.has(itemId)) {
      throw new ServiceError('Menu item not found', {
        code: 'MENU_ITEM_NOT_FOUND',
        statusCode: 400,
      })
    }
  }
})
```

```typescript
// pylon/src/resolvers/order.ts (lines 85-102)
createOrder: validateCreateOrder((userId: Int, items: Int[]): Order => {
  const id = incrementId()
  const newOrder = {
    id,
    userId,
    itemIds: items,
    status: 'PENDING' as const,
    createdAt: new Date(),
  }
  orderMap.set(id, newOrder)
  return new Order(
    newOrder.id,
    newOrder.userId,
    newOrder.itemIds,
    newOrder.status,
    newOrder.createdAt,
  )
})
```

- ✅ **灵活**：可以编写任意复杂的验证逻辑
- ✅ **可复用**：验证装饰器可以复用
- ⚠️ **需要手动编写**：验证逻辑需要手动编写，不如声明式验证库（如 Zod）简洁
- ⚠️ **可维护性一般**：验证逻辑分散在装饰器中，不如集中管理清晰

#### 总结

- ✅ **参数定义简洁**：直接使用函数参数，自动推断为 GraphQL 参数
- ✅ **类型安全**：充分利用 TypeScript 的类型系统
- ⚠️ **验证能力中等**：需要手动编写验证逻辑，无内置验证库支持
- ⚠️ **可维护性一般**：验证逻辑分散，不如声明式验证库清晰

---

### 6. 内置功能

**评估结果：功能完整，通过插件和 Hono 生态扩展**

Pylon 通过 Envelop 插件系统和 Hono 框架提供丰富的内置功能，既保持了核心库的轻量，又提供了企业级应用所需的功能。

#### Directives（指令）

支持通过 Envelop 插件系统使用 GraphQL Directives。Pylon 本身不直接定义 Directives，但可以通过 Envelop 插件（如 `@envelop/directives`）实现。

**文档参考**：[Plugins | Pylon](https://pylon.cronit.io/docs/core-concepts/plugins)

- ⚠️ **间接支持**：需要通过 Envelop 插件实现，不是原生支持
- ✅ **生态丰富**：可以利用 Envelop 生态系统的所有 Directives 插件
- ⚠️ **需要额外配置**：需要安装和配置 Envelop 插件

#### Extensions（扩展）

支持通过 Envelop 插件系统扩展 GraphQL Schema 的功能，如查询复杂度、缓存等。

**文档参考**：[Plugins | Pylon](https://pylon.cronit.io/docs/core-concepts/plugins)

**实现方式**（基于文档示例）：
```typescript
import {app, PylonConfig, ServiceError} from '@getcronit/pylon'
import {useErrorHandler} from '@envelop/core'

export const graphql = {
  Query: {
    hello: () => {
      throw new ServiceError('Hello, world!', {
        code: 'HELLO_WORLD',
        statusCode: 400
      })
    }
  },
  Mutation: {}
}

export const config: PylonConfig = {
  plugins: [
    useErrorHandler(({errors, context, phase}) => {
      console.error(errors)
    })
  ]
}
```

- ✅ **插件扩展**：通过 Envelop 插件系统可以添加各种扩展功能
- ✅ **生态丰富**：可以利用 Envelop 生态系统的所有插件
- ⚠️ **需要额外配置**：需要安装和配置 Envelop 插件

#### 批量加载 (Batching)

原生支持 DataLoader 集成，可以优雅地解决 N+1 查询问题。通过 `getContext()` 访问上下文中的 loaders。

**实现方式**：

```typescript
// pylon/src/index.ts (lines 8-11)
// Add loaders to context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

```typescript
// pylon/src/loaders.ts (lines 8-49)
export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      const allOrders = Array.from(orderMap.values())
      const orderGroups = new Map<number, Order[]>()

      for (const o of allOrders) {
        const orders = orderGroups.get(o.userId) ?? []
        orders.push(new Order(o.id, o.userId, o.itemIds, o.status, o.createdAt))
        orderGroups.set(o.userId, orders)
      }

      return userIds.map((id) => orderGroups.get(id) ?? [])
    }),

    users: new DataLoader<number, User>(async (userIds) => {
      return userIds.map((id) => {
        const u = userMap.get(id)
        if (!u) {
          return new Error('User not found')
        }
        return new User(u.id, u.name, u.email)
      })
    }),

    menuItems: new DataLoader<number, MenuItem>(async (itemIds) => {
      return itemIds.map((id) => {
        const i = menuItemMap.get(id)
        if (!i) {
          return new Error('Menu item not found')
        }
        if (i.__typename === 'Coffee') {
          return new Coffee(i.id, i.name, i.price, i.sugarLevel, i.origin)
        } else {
          return new Dessert(i.id, i.name, i.price, i.calories)
        }
      })
    }),
  }
}
```

```typescript
// pylon/src/resolvers/user.ts (lines 39-42)
async orders(): Promise<Order[]> {
  const loaders = getContext().get('loaders')
  return loaders.userOrders.load(this.id)
}
```

- ✅ **原生支持**：直接使用 DataLoader，无需额外插件
- ✅ **易于使用**：通过 `getContext()` 访问 loaders，API 简洁
- ✅ **类型安全**：支持 TypeScript 类型定义
- ⚠️ **需要手动配置**：需要手动创建和配置 DataLoader 实例

#### 自定义标量 (Scalars)

内置了多种常用的标量类型，自动从 TypeScript 类型推断。

**内置标量类型**：

```graphql
// pylon/schema.graphql (lines 66-77)
scalar ID
scalar Int
scalar Float
scalar Number
scalar Any
scalar Void
scalar Object
scalar File
scalar Date
scalar JSON
scalar String
scalar Boolean
```

- ✅ **内置标量丰富**：内置了 `Date`、`JSON`、`Number`、`Any`、`Void`、`Object`、`File` 等常用标量
- ✅ **自动推断**：从 TypeScript 类型自动推断标量类型（如 `Date` 类型自动映射为 `Date` 标量）
- ✅ **类型安全**：TypeScript 类型与 GraphQL 标量自动同步
- ⚠️ **自定义标量**：需要查看文档确认如何定义新的自定义标量类型

#### 订阅 (Subscription)

从文档和代码中未看到明确的 GraphQL Subscription 支持。

- ❌ **不支持 Subscription**：目前不支持 GraphQL Subscription
- ⚠️ **可能需要通过 Envelop 插件**：可能可以通过 Envelop 插件实现，但需要确认

#### 上下文 (Context)

原生支持在 Resolver 中访问请求上下文，包括 `getContext()` 和 `getEnv()` 函数。

**文档参考**：[Context Management | Pylon](https://pylon.cronit.io/docs/core-concepts/context-management)

**实现方式**（基于文档示例）：
```typescript
import {app, getContext, getEnv} from '@getcronit/pylon'

export const graphql = {
  Query: {
    protected: () => {
      const ctx = getContext()
      const header = ctx.req.header('X-API-Key')
      
      if (header !== 'secret') {
        return new Response('Unauthorized', {status: 401})
      }
      
      return new Response('The secret is safe with me!')
    },
    secret: () => {
      const secret = getEnv().SECRET_KEY
      return new Response(`The secret key is: ${secret}`)
    }
  }
}
```

**自定义 Bindings 和 Variables**：

```typescript
// pylon/pylon.d.ts (lines 4-10)
declare module '@getcronit/pylon' {
  interface Bindings {}

  interface Variables {
    loaders: Loaders
  }
}
```

- ✅ **完整支持**：支持访问请求上下文、环境变量、自定义 Bindings 和 Variables
- ✅ **类型安全**：通过 TypeScript 类型定义确保类型安全
- ✅ **运行时无关**：`getEnv()` 函数支持多种运行时（Node.js、Bun、Cloudflare Workers）

#### 中间件 (Middleware)

原生支持 Hono 中间件，可以通过装饰器应用到服务函数，也可以应用到路由。

**文档参考**：[Decorators | Pylon](https://pylon.cronit.io/docs/core-concepts/decorators)

**实现方式**（基于文档示例）：
```typescript
import {app, createDecorator, getContext} from '@getcronit/pylon'
import {basicAuth} from 'hono/basic-auth'

const authMiddleware = basicAuth({
  username: 'admin',
  password: 'password'
})

const requireBasicAuth = createDecorator(async () => {
  const ctx = getContext()
  await authMiddleware(ctx, async () => {})
})

export const graphql = {
  Query: {
    secure: requireBasicAuth(() => {
      return 'You are authenticated!'
    })
  }
}

app.get('/', authMiddleware, c => {
  return new Response('Hello World')
})
```

- ✅ **完整支持**：支持所有 Hono 中间件
- ✅ **灵活应用**：可以通过装饰器应用到服务函数，也可以应用到路由
- ✅ **生态丰富**：可以利用 Hono 生态系统的所有中间件
- ✅ **类型安全**：与核心 API 深度集成，保持类型安全

#### 总结

- ✅ **功能完整**：通过 Envelop 插件系统和 Hono 框架提供丰富的功能
- ✅ **生态丰富**：可以利用 Envelop 和 Hono 生态系统的所有插件和中间件
- ✅ **类型安全**：所有功能都与核心 API 深度集成，保持类型安全
- ⚠️ **需要额外配置**：某些功能（如 Directives、Extensions）需要通过 Envelop 插件实现
- ❌ **不支持 Subscription**：目前不支持 GraphQL Subscription

---

### 7. 生态集成

**评估结果：集成优秀，支持主流工具和框架**

Pylon 与 TypeScript 生态中的主流工具深度集成，提供了端到端的类型安全链路。

#### ORM 集成

**Prisma 集成（推荐）**

Pylon 与 Prisma 深度集成，推荐使用 `@getcronit/prisma-extended-models` 包来简化 Prisma 模型的使用。

**文档参考**：[Databases | Pylon](https://pylon.cronit.io/docs/integrations/databases)

**实现方式**（基于文档示例）：
```typescript
import {app} from '@getcronit/pylon'
import {Post} from '../repository/models'

export const graphql = {
  Query: {
    getPost: async (id: number) => {
      return await Post.get({ id })
    },
    allPosts: async () => {
      return await Post.paginate()
    }
  },
  Mutation: {
    createPost: async (data: any) => {
      return await Post.create({ data })
    }
  }
}
```

- ✅ **深度集成**：通过 `@getcronit/prisma-extended-models` 自动解析关联关系
- ✅ **类型安全**：Prisma 生成的 TypeScript 类型与 Pylon 自动同步
- ✅ **自动分页**：支持自动生成分页连接（Paginatable Connections）
- ✅ **自动关联**：自动解析 Prisma 模型之间的关联关系

**其他数据库支持**

Pylon 也支持其他数据库（如 MongoDB），但需要手动定义类型接口。

**实现方式**（基于文档示例）：
```typescript
import {app} from '@getcronit/pylon'
import {MongoClient} from 'mongodb'

const uri = 'mongodb://localhost:27017'
const client = new MongoClient(uri)

let usersCollection: any

;(async () => {
  await client.connect()
  const database = client.db('myDatabase')
  usersCollection = database.collection('users')
})()

export const graphql = {
  Query: {
    getUser: async (id: string) => {
      return await usersCollection.findOne({_id: id})
    }
  },
  Mutation: {
    createUser: async (user: any) => {
      await usersCollection.insertOne(user)
      return user
    }
  }
}
```

- ✅ **数据库无关**：不强制使用特定的 ORM，可以自由选择数据库
- ⚠️ **需要手动定义类型**：使用其他数据库时需要手动定义 TypeScript 类型接口
- ⚠️ **类型安全**：使用 `any` 类型时可能暴露所有数据到 Schema，需要注意安全性

#### 验证库集成

Pylon 不直接集成验证库（如 Zod、Yup），但可以通过装饰器实现验证逻辑。

**实现方式**：

```typescript
// pylon/src/resolvers/user.ts (lines 13-20)
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})
```

- ⚠️ **无直接集成**：不直接集成验证库，需要手动编写验证逻辑
- ✅ **可通过装饰器实现**：可以使用装饰器包装验证逻辑
- ⚠️ **不如声明式验证**：不如使用 Zod 等验证库的声明式验证简洁

#### Server 兼容性

Pylon 基于 Hono 框架，支持多种运行时和服务器环境。

**支持的运行时**：
- ✅ **Node.js**：完全支持
- ✅ **Bun**：完全支持（推荐）
- ✅ **Cloudflare Workers**：完全支持

**Hono 集成**：

```typescript
// pylon/src/index.ts (lines 1-11)
import { app } from '@getcronit/pylon'
import { userQueries, userMutations } from './resolvers/user.ts'
import { menuQueries, menuMutations } from './resolvers/menu.ts'
import { orderQueries, orderMutations } from './resolvers/order.ts'
import { createLoaders } from './loaders.ts'

// Add loaders to context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**文档参考**：[Context Management | Pylon](https://pylon.cronit.io/docs/core-concepts/context-management)

- ✅ **多运行时支持**：支持 Node.js、Bun、Cloudflare Workers 等多种运行时
- ✅ **Hono 生态**：可以利用 Hono 生态系统的所有功能和中间件
- ✅ **灵活部署**：可以在各种环境中部署，包括边缘计算环境
- ✅ **类型安全**：在所有运行时中保持类型安全

#### 客户端集成

**GQty 集成**

Pylon 与 GQty 深度集成，可以自动生成客户端代码。

**文档参考**：[GQty | Pylon](https://pylon.cronit.io/docs/integrations/gqty)

**特性**：
- ✅ **实时 API 更新**：API 的破坏性变更会立即反映在前端
- ✅ **类型安全**：GQty 提供一流的 TypeScript 体验
- ✅ **自动数据需求**：GQty 自动获取应用中的数据需求
- ✅ **即时类型错误**：API 的破坏性变更会立即显示类型错误

- ✅ **深度集成**：与 GQty 深度集成，提供端到端的类型安全
- ✅ **自动生成**：可以自动生成客户端代码
- ✅ **实时同步**：API 变更会实时同步到客户端

#### 总结

- ✅ **ORM 集成优秀**：与 Prisma 深度集成，推荐使用 `@getcronit/prisma-extended-models`
- ✅ **多运行时支持**：支持 Node.js、Bun、Cloudflare Workers 等多种运行时
- ✅ **Hono 生态**：可以利用 Hono 生态系统的所有功能和中间件
- ✅ **客户端集成**：与 GQty 深度集成，提供端到端的类型安全
- ⚠️ **验证库集成一般**：不直接集成验证库，需要通过装饰器实现验证逻辑

