# Garph 评估报告 (2026)

> 本报告基于实际业务代码 (`typescript-graphql-schemas/garph/src`) 及官方示例 (`@garph/examples`) 生成。

## 📋 基本信息
| 项目         | 内容                            |
| :----------- | :------------------------------ |
| **当前版本** | 0.6.8                           |
| **GitHub**   | https://github.com/stepci/garph |
| **文档站**   | https://garph.dev/docs          |
| **初次提交** | 2023-01-19                      |
| **最近提交** | 2024-03-01                      |

## 📊 综合评分
| 维度                | 得分 (1-5) | 简评                                       |
| :------------------ | :--------- | :----------------------------------------- |
| **1. 架构模式**     | <-待评分-> | Builder 模式，零魔法，即写即用，依赖轻量   |
| **2. 类型定义**     | <-待评分-> | 深度推断，智能继承，枚举灵活，Union 需手动 |
| **3. 解析器与验证** | <-待评分-> | 参数自动推断，DataLoader 原生，无内置验证  |
| **4. 内置功能**     | <-待评分-> | 核心功能完善，高级功能缺失，安全功能不足   |
| **5. 生态集成**     | <-待评分-> | 标准兼容，ORM/验证集成弱，无官方适配器     |

---

## 1. 架构模式 (Architecture)

### 架构模式类型

**Builder（构建器）模式**：Garph 采用函数式链式 API 显式构建 GraphQL Schema，通过 `GarphSchema` 实例（通常命名为 `g`）提供类型定义方法，最终通过 `buildSchema()` 函数在运行时将定义转换为标准的 GraphQL Schema。

### 核心实现机制

**源码证据**：
- 核心 API 定义：`garph/src/index.ts`（第 598-727 行）定义了 `GarphSchema` 类及其方法
- Schema 构建：`garph/src/schema.ts`（第 17-21 行）的 `buildSchema()` 函数使用 `graphql-compose` 的 `SchemaComposer` 进行转换
- 业务代码示例：`typescript-graphql-schemas/garph/src/schema.ts`（第 7 行）创建 `GarphSchema` 实例，第 306 行调用 `buildSchema({ g, resolvers })`

**构建流程**：
```typescript
// 1. 创建 Schema 实例
const g = new GarphSchema()

// 2. 定义类型（链式 API）
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
})

// 3. 运行时构建 Schema
const schema = buildSchema({ g, resolvers })
```

### 评分详情

#### 1.1 依赖复杂度 (Dependency Complexity)

**得分：<-待评分->**

**证据**：
- **运行时依赖**（`garph/package.json` 第 30-33 行）：
  - `graphql-compose: ^9.0.10` - GraphQL Schema 构建工具
  - `single-user-cache: ^0.6.0` - DataLoader 缓存实现
- **无装饰器依赖**：不需要 `reflect-metadata` 或装饰器支持
- **无代码生成工具**：不需要 CLI 或代码生成步骤

**分析**：
- ✅ 仅 2 个运行时依赖，相比装饰器模式（需要 `reflect-metadata`、`class-validator` 等）更轻量
- ⚠️ `graphql-compose` 是一个功能完整的 Schema 构建库，增加了依赖体积，但提供了强大的底层能力
- ✅ `single-user-cache` 用于内置 DataLoader 支持，属于功能增强而非核心依赖

#### 1.2 构建流程 (Build Flow)

**得分：<-待评分->**

**证据**：
- **纯运行时构建**：`garph/src/schema.ts`（第 17-21 行）的 `buildSchema()` 函数在运行时执行
- **无代码生成**：业务代码（`typescript-graphql-schemas/garph/src/server.ts`）直接运行 TypeScript，无需预构建步骤
- **无 CLI 工具**：`garph/package.json` 中无专门的构建脚本，仅包含文档和测试脚本

**实际使用**：
```typescript
// typescript-graphql-schemas/garph/src/server.ts
import { schema } from './schema.ts'
const yoga = createYoga({ schema })
// 直接运行，无需构建步骤
```

**分析**：
- ✅ 完全运行时构建，开发者编写代码后可直接运行
- ✅ 支持热重载（如 `node --watch`），开发体验优秀
- ✅ 无需学习额外的 CLI 命令或构建配置

#### 1.3 配置魔法 (Config & Language Magic)

**得分：<-待评分->**

**证据**：
- **无装饰器**：所有类型定义使用函数调用，如 `g.type()`, `g.string()`
- **无反射元数据**：不需要 `import 'reflect-metadata'` 或配置 `experimentalDecorators`
- **标准 TypeScript**：`typescript-graphql-schemas/garph/tsconfig.json` 仅包含标准配置，无特殊设置
- **类型推断**：使用 TypeScript 泛型和条件类型实现类型安全（`Infer`, `InferResolvers`）

**代码示例**：
```typescript
// 完全符合原生 TypeScript 最佳实践
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
})

// 类型推断自动工作
type User = Infer<typeof UserType>
```

**分析**：
- ✅ 零魔法，完全符合原生 TypeScript 最佳实践
- ✅ 不依赖实验性特性或编译器插件
- ✅ IDE 支持完善，类型提示和自动补全正常工作
- ✅ 代码可读性强，链式 API 直观易懂

#### 1.4 生态集成 (Ecosystem Integration)

**得分：<-待评分->**

**证据**：
- **标准安装**：`npm install garph` 即可使用，无特殊要求
- **Server 兼容性**：官方示例（`garph/examples/demo.ts`）使用 `graphql-yoga`，但可与任何 GraphQL Server 集成
- **底层使用 graphql-compose**：`garph/src/schema.ts`（第 2 行）导入 `SchemaComposer`，最终输出标准 `GraphQLSchema`
- **业务代码集成**：`typescript-graphql-schemas/garph/src/server.ts` 直接使用 `graphql-yoga`，集成简单

**分析**：
- ✅ 标准 npm 包，可自由集成到任何项目
- ✅ 输出标准 GraphQL Schema，兼容所有 GraphQL Server
- ✅ 不绑定特定框架，可灵活选择底层实现
- ⚠️ 虽然不强制绑定，但官方示例和文档主要展示 `graphql-yoga` 集成

### 架构模式综合评分

**得分：<-待评分->**

**评分依据**：
- 依赖复杂度：<-待评分->（轻量依赖，但 `graphql-compose` 增加体积）
- 构建流程：<-待评分->（即写即用，零构建步骤）
- 配置魔法：<-待评分->（零魔法，完全原生 TypeScript）
- 生态集成：<-待评分->（良好集成，标准兼容）

**优势**：
1. **零配置启动**：无需装饰器、反射或代码生成，开箱即用
2. **类型安全**：通过 TypeScript 类型系统实现端到端类型安全
3. **开发体验优秀**：链式 API 直观，IDE 支持完善
4. **运行时构建**：支持热重载，开发迭代快速

**劣势**：
1. **依赖 graphql-compose**：虽然功能强大，但增加了包体积
2. **显式 API 调用**：相比装饰器模式，需要更多显式代码（但换来零魔法优势）

## 2. 类型定义 (Type Definition)

### 核心实现机制

Garph 采用 **Builder API + 类型推断** 的方式实现类型定义。Schema 定义通过链式 API 创建，TypeScript 类型通过 `Infer` 工具类型从 Schema 定义自动推断，GraphQL Schema 通过 `buildSchema()` 运行时生成。

**源码证据**：
- 类型推断实现：`garph/src/index.ts`（第 93-118 行）定义了 `Infer` 类型工具
- Schema 构建：`garph/src/schema.ts`（第 85-170 行）将 Garph 类型转换为 GraphQL Schema
- 业务代码示例：`typescript-graphql-schemas/garph/src/schema.ts`（第 68-70 行）使用 `Infer` 推断类型

### 评分详情

#### 2.1 单一数据源（Single Source of Truth）实现度

**得分：<-待评分->**

**证据**：
- **Schema 定义即数据源**：`typescript-graphql-schemas/garph/src/schema.ts`（第 23-66 行）通过 `g.type()` 等方法定义 Schema
- **TypeScript 类型自动推断**：第 68-70 行使用 `Infer<typeof UserType>` 从 Schema 定义推断类型
- **GraphQL Schema 自动生成**：第 306 行通过 `buildSchema({ g, resolvers })` 生成标准 GraphQL Schema
- **验证逻辑分离**：验证需要手动在 Scalar 或 Resolver 中实现（第 181 行），不支持从验证规则自动生成类型

**代码示例**：
```typescript
// 单一数据源：Schema 定义
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
})

// TypeScript 类型自动推断
type User = Infer<typeof UserType>
// 结果：{ id: number, name: string, email: string }

// GraphQL Schema 自动生成
const schema = buildSchema({ g, resolvers })
```

**分析**：
- ✅ Schema 定义是单一数据源，TypeScript 类型和 GraphQL Schema 都从中派生
- ✅ 类型推断深度：支持嵌套类型、可选字段、数组等复杂场景
- ⚠️ 验证逻辑需要手动集成：虽然有 Zod 示例（`garph/www/docs/advanced/validation.md` 第 35-70 行），但不是原生支持，需要手动在 Scalar 的 `parseValue` 中调用验证
- ⚠️ 验证规则与类型定义分离：无法从验证规则自动生成类型，需要手动维护同步

#### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**得分：<-待评分->**

**证据**：
- **`as const` 数组支持**：`typescript-graphql-schemas/garph/src/schema.ts`（第 15-19 行）使用 `g.enumType('OrderStatus', ['PENDING', 'COMPLETED', 'CANCELLED'] as const)`
- **TypeScript Enum 支持**：官方文档（`garph/www/docs/guide/schemas.md` 第 129-138 行）展示支持 TypeScript Enum
- **类型推断要求**：必须使用 `as const` 才能正确推断类型（文档第 127 行明确说明）

**代码示例**：
```typescript
// 方式 1：as const 数组（推荐）
const OrderStatusEnum = g.enumType('OrderStatus', [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
] as const)

// 方式 2：TypeScript Enum
enum Fruits {
  Apples,
  Oranges
}
g.enumType('Fruits', Fruits)
```

**分析**：
- ✅ 支持两种方式：`as const` 数组和 TypeScript Enum
- ✅ 无需重定义成员名称：直接使用数组或 Enum，无需手动映射
- ⚠️ 必须使用 `as const`：缺少 `as const` 会导致类型推断失败，需要开发者记住这个要求
- ✅ 类型安全：枚举值在 TypeScript 和 GraphQL 中完全同步

#### 2.3 接口继承与联合类型体验（Interface & Union）

**得分：<-待评分->**

**证据**：
- **接口字段自动继承**：`typescript-graphql-schemas/garph/src/schema.ts`（第 34-51 行）展示接口实现
  - `FoodInterface` 定义公共字段（id, name, price）
  - `CoffeeType` 和 `DessertType` 通过 `.implements(FoodInterface)` 自动继承
  - 实现类型只需定义特有字段（sugarLevel/origin 和 calories）
- **运行时自动合并**：`garph/src/schema.ts`（第 94-98 行）在构建 Schema 时自动将接口字段添加到实现类型
- **类型系统支持**：`garph/src/index.ts`（第 195 行）使用 `UnionToIntersection` 在类型层面合并接口字段
- **Union 类型需要手动处理**：`typescript-graphql-schemas/garph/src/schema.ts`（第 202-211 行）需要在 Resolver 中手动返回 `__typename`
- **Union 类型决议**：`garph/examples/union.ts`（第 36-39 行）需要手动实现 `__resolveType`

**代码示例**：
```typescript
// 接口定义
const FoodInterface = g.interface('Food', {
  id: g.int(),
  name: g.string(),
  price: g.float(),
})

// 实现接口（自动继承字段）
const CoffeeType = g
  .type('Coffee', {
    sugarLevel: g.ref(SugarLevelEnum),
    origin: g.string(),
  })
  .implements(FoodInterface)
// CoffeeType 自动包含 id, name, price 字段

// Union 类型定义
const MenuItemType = g.unionType('MenuItem', {
  Coffee: CoffeeType,
  Dessert: DessertType,
})

// Union 类型需要手动处理 __typename
createCoffee: (_, { name, price, sugarLevel, origin }) => {
  return {
    __typename: 'Coffee' as const,  // 必须手动指定
    id,
    name,
    price,
    sugarLevel,
    origin,
  }
}
```

**分析**：
- ✅ 接口字段自动继承：实现类型无需重复声明公共字段
- ✅ 类型系统支持：TypeScript 类型也自动包含接口字段
- ⚠️ Union 类型需要手动 `__typename`：必须在返回对象中显式指定类型名称
- ⚠️ Union 类型需要手动 `__resolveType`：需要实现类型决议函数（虽然可选，但通常需要）
- ✅ 支持多接口实现：可以同时实现多个接口（`garph/examples/implements.ts` 第 13 行）

#### 2.4 类型推断强度与显式声明平衡

**得分：<-待评分->**

**证据**：
- **自动推断基础类型**：`garph/src/index.ts`（第 108-118 行）的 `InferShallow` 自动处理 String、Int、Float、Boolean、ID、Enum 等基础类型
- **自动推断复杂类型**：支持数组（`AnyList`）、可选（`AnyOptional`）、嵌套对象（递归 `InferRaw`）、Union 类型
- **Resolver 类型推断**：`InferResolvers`（第 134-154 行）自动推断 Resolver 的参数类型和返回值类型
- **需要显式类型注解**：`typescript-graphql-schemas/garph/src/schema.ts`（第 152-160 行）需要为 Resolver 对象添加 `InferResolvers` 类型注解

**代码示例**：
```typescript
// 基础类型自动推断
const UserType = g.type('User', {
  id: g.int(),           // 推断为 number
  name: g.string(),      // 推断为 string
  email: g.string(),     // 推断为 string
})

type User = Infer<typeof UserType>
// 自动推断为：{ id: number, name: string, email: string }

// 复杂类型自动推断
const OrderType = g.type('Order', {
  userId: g.int(),
  itemIds: g.int().list(),              // 推断为 number[]
  status: g.ref(OrderStatusEnum),        // 推断为枚举值
  createdAt: g.ref(DateTime),            // 推断为 Date
  items: g.ref(MenuItemType).list(),    // 推断为 MenuItem[]
})

// Resolver 类型自动推断
const resolvers: InferResolvers<
  { Query: typeof queryType },
  {}
> = {
  Query: {
    user: (_, { id }) => {  // id 自动推断为 number
      // ...
    }
  }
}
```

**分析**：
- ✅ 强大的类型推断：支持基础类型、数组、可选、嵌套、Union 等所有 GraphQL 类型
- ✅ Resolver 参数类型自动推断：通过 `InferResolvers` 自动推断参数类型，无需手动声明
- ✅ 递归类型推断：支持深度嵌套的对象类型
- ⚠️ 需要显式类型注解：Resolver 对象需要添加 `InferResolvers` 类型注解（虽然这是为了类型安全，但增加了代码量）
- ✅ IDE 支持完善：类型提示和自动补全正常工作

### 类型定义综合评分

**得分：<-待评分->**

**评分依据**：
- SSOT 实现度：<-待评分->（深度推断，但验证逻辑分离）
- 枚举支持：<-待评分->（轻量映射，但需要 `as const`）
- 接口继承：<-待评分->（智能继承，但 Union 需要手动处理）
- 类型推断强度：<-待评分->（强大推断，但需要显式类型注解）

**优势**：
1. **类型推断强大**：从 Schema 定义自动推断 TypeScript 类型，支持复杂场景
2. **接口自动继承**：实现接口时无需重复声明公共字段
3. **枚举支持灵活**：支持 `as const` 数组和 TypeScript Enum
4. **类型安全完整**：端到端类型安全，从 Schema 到 Resolver

**劣势**：
1. **Union 类型需要手动处理**：必须手动返回 `__typename` 和实现 `__resolveType`
2. **验证逻辑分离**：验证规则与类型定义分离，需要手动维护同步
3. **需要显式类型注解**：Resolver 对象需要添加 `InferResolvers` 类型注解

## 3. 解析器与验证 (Resolvers & Validation)

### 核心实现机制

Garph 的 Resolver 定义采用 **显式类型注解 + 自动类型推断** 的方式。所有 Resolver 集中在一个对象中，按 `Query`、`Mutation` 和类型名称组织。参数类型通过 `InferResolvers` 工具类型自动推断，但需要为 Resolver 对象添加显式类型注解。

**源码证据**：
- Resolver 类型推断：`garph/src/index.ts`（第 134-154 行）定义了 `InferResolvers` 类型工具
- 业务代码示例：`typescript-graphql-schemas/garph/src/schema.ts`（第 152-304 行）展示完整的 Resolver 定义

### 评分详情

#### 3.1 开发体验（代码简洁度）

**得分：<-待评分->**

**证据**：
- **Resolver 定义简洁**：`typescript-graphql-schemas/garph/src/schema.ts`（第 161-178 行）Query Resolver 定义直观
- **参数类型自动推断**：第 163 行的 `user: (_, { id })` 中，`id` 类型自动推断为 `number`
- **需要显式类型注解**：第 152-160 行需要为 Resolver 对象添加 `InferResolvers` 类型注解
- **验证逻辑手动编写**：第 181、192、250-260 行需要手动编写验证逻辑

**代码示例**：
```typescript
// Resolver 定义（简洁但需要类型注解）
const resolvers: InferResolvers<
  {
    Query: typeof queryType
    Mutation: typeof mutationType
    User: typeof UserType
    Order: typeof OrderType
  },
  {}
> = {
  Query: {
    users: () => Array.from(userMap.values()),
    user: (_, { id }) => {  // id 自动推断为 number
      const user = userMap.get(id)
      if (!user) throw new GraphQLError('User not found')
      return user
    },
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      // 需要手动编写验证逻辑
      if (!email.includes('@')) {
        throw new GraphQLError('Invalid email format')
      }
      // ...
    },
  },
}
```

**分析**：
- ✅ Resolver 函数定义简洁，参数类型自动推断
- ✅ IDE 支持完善，类型提示和自动补全正常工作
- ⚠️ 需要显式类型注解：Resolver 对象需要添加 `InferResolvers` 类型注解（虽然这是为了类型安全，但增加了代码量）
- ⚠️ 验证逻辑需要手动编写：每个需要验证的地方都要手动编写验证代码

#### 3.2 模块化设计（领域驱动开发支持）

**得分：<-待评分->**

**证据**：
- **按操作类型组织**：`typescript-graphql-schemas/garph/src/schema.ts`（第 152-304 行）所有 Resolver 都在一个对象中，按 `Query`、`Mutation`、`User`、`Order` 组织
- **无强制模块边界**：没有强制性的模块边界，所有 Resolver 都在同一个文件中
- **容易写出耦合代码**：如果不注意，容易将所有领域的 Query/Mutation/Field Resolver 都写在一个文件中
- **可以手动拆分**：虽然可以按领域模块拆分文件，但需要手动组合，且没有强制性的模块边界

**代码示例**：
```typescript
// 所有 Resolver 都在一个对象中，按操作类型组织
const resolvers: InferResolvers<...> = {
  Query: {
    users: ...,
    user: ...,
    menu: ...,
    menuItem: ...,
    orders: ...,
    order: ...,
  },
  Mutation: {
    createUser: ...,
    updateUser: ...,
    deleteUser: ...,
    createCoffee: ...,
    // ... 所有 Mutation 混在一起
  },
  User: {
    orders: ...,
  },
  Order: {
    user: ...,
    items: ...,
  },
}
```

**分析**：
- ❌ 完全按操作类型隔离：`Query`、`Mutation`、`Type` 分别组织，不是按领域组织
- ❌ 无强制模块边界：没有强制性的模块边界，容易写出耦合的巨型文件
- ⚠️ 需要手动组合：如果要模块化，需要手动拆分文件并组合，但框架不强制
- ⚠️ 支持 DDD 有限：虽然可以按文件组织，但缺乏强制性的模块边界，容易写出耦合代码

#### 3.3 参数定义与类型推导

**得分：<-待评分->**

**证据**：
- **参数定义在字段中**：`typescript-graphql-schemas/garph/src/schema.ts`（第 80-82 行）参数通过 `.args()` 定义在字段中
- **参数类型自动推断**：第 163 行的 `user: (_, { id })` 中，`id` 类型通过 `InferResolvers` 自动推断为 `number`
- **IDE 提示完善**：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- **需要显式类型注解**：第 152-160 行需要为 Resolver 对象添加 `InferResolvers` 类型注解

**代码示例**：
```typescript
// 参数定义在字段中
const queryType = g.type('Query', {
  user: g.ref(UserType).optional().args({
    id: g.int(),  // 参数定义
  }),
})

// 参数类型自动推断
const resolvers: InferResolvers<{ Query: typeof queryType }, {}> = {
  Query: {
    user: (_, { id }) => {  // id 自动推断为 number
      // ...
    },
  },
}
```

**分析**：
- ✅ 参数类型大部分自动推断：通过 `InferResolvers` 自动推断参数类型，无需手动声明
- ✅ IDE 提示完善：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- ⚠️ 需要显式类型注解：Resolver 对象需要添加 `InferResolvers` 类型注解（虽然这是为了类型安全，但增加了代码量）
- ✅ 类型安全：参数类型与 Schema 定义完全同步

#### 3.4 输入验证机制

**得分：<-待评分->**

**证据**：
- **无内置验证**：`typescript-graphql-schemas/garph/src/schema.ts`（第 181、192、250-260 行）所有验证逻辑都需要手动编写
- **可以通过 Scalar 实现**：`garph/examples/validation.ts`（第 6-15 行）展示通过 Scalar 的 `parseValue` 实现验证
- **支持 Zod 集成**：`garph/www/docs/advanced/validation.md`（第 35-70 行）展示使用 Zod 验证，但需要手动在 Scalar 中调用
- **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用

**代码示例**：
```typescript
// 方式 1：在 Resolver 中手动验证
createUser: (_, { name, email }) => {
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  // ...
}

// 方式 2：通过 Scalar 实现验证
const username = g.scalarType<string, string>('Username', {
  serialize: (username) => username,
  parseValue: (username) => {
    if (username.length < 3) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})

// 方式 3：使用 Zod（需要手动调用）
const usernameValidator = z.string().min(3)
const username = g.scalarType<string, string>('Username', {
  parseValue: (username) => {
    if (!usernameValidator.safeParse(username).success) {
      throw new GraphQLError('Username must be at least 3 characters long')
    }
    return username
  }
})
```

**分析**：
- ❌ 无内置验证：不提供声明式验证 API（如 `.refine()` 或 `@IsEmail()`）
- ❌ 验证逻辑重复：需要在每个需要验证的地方手动编写验证代码
- ⚠️ 可以通过 Scalar 实现：但需要为每个验证场景创建独立的 Scalar 类型，增加了代码量
- ⚠️ 支持 Zod 集成：但需要手动在 Scalar 的 `parseValue` 中调用，验证逻辑与 Schema 定义分离
- ❌ 无声明式 API：不提供类似 `.refine()` 的声明式验证 API

#### 3.5 批量加载（DataLoader）集成

**得分：<-待评分->**

**证据**：
- **原生内置支持**：`garph/src/schema.ts`（第 193-220 行）的 `addResolver` 函数自动处理 `load` 和 `loadBatch` 方法
- **使用 single-user-cache**：第 4-5 行使用 `single-user-cache` 实现 DataLoader 功能
- **几乎无样板代码**：`garph/examples/loader.ts`（第 34-44 行）展示只需定义 `load` 函数，无需配置 Context 或创建 DataLoader 实例
- **支持缓存控制**：`load` 方法支持缓存，`loadBatch` 方法不支持缓存

**代码示例**：
```typescript
// 定义字段时使用 .omitResolver()
const Dog = g.type('Dog', {
  name: g.string(),
  owner: g.string().omitResolver()  // 标记为需要 Resolver
})

// Resolver 中定义 load 函数
const resolvers: InferResolvers<{ Query: typeof queryType, Dog: typeof Dog }, {}> = {
  Query: {
    dogs: (parent, args, context, info) => {
      return [{ name: 'Apollo' }, { name: 'Buddy' }]
    }
  },
  Dog: {
    owner: {
      load(queries) {  // 自动批量加载，支持缓存
        return Promise.resolve(
          queries.map(q => owners[q.parent.name])
        )
      }
    }
  }
}
```

**分析**：
- ✅ 原生内置支持：无需安装额外插件或配置，直接使用 `load` 或 `loadBatch` 方法
- ✅ 几乎无样板代码：只需定义 `load` 函数，无需配置 Context 或创建 DataLoader 实例
- ✅ 自动批量处理：框架自动收集查询并批量执行
- ✅ 支持缓存控制：`load` 支持缓存，`loadBatch` 不支持缓存
- ✅ 类型安全：`load` 函数的参数和返回值类型自动推断

### 解析器与验证综合评分

**得分：<-待评分->**

**评分依据**：
- 开发体验：<-待评分->（代码简洁，但需要显式类型注解）
- 模块化设计：<-待评分->（无模块化考虑，按操作类型组织）
- 参数定义与类型推导：<-待评分->（参数类型大部分自动推断）
- 输入验证机制：<-待评分->（无内置验证，需要完全手动实现）
- DataLoader 集成：<-待评分->（原生内置支持，无缝调用）

**优势**：
1. **参数类型自动推断**：通过 `InferResolvers` 自动推断参数类型，IDE 支持完善
2. **DataLoader 原生支持**：内置 DataLoader 支持，几乎无样板代码
3. **代码简洁**：Resolver 函数定义直观，易于理解

**劣势**：
1. **无内置验证**：需要手动编写所有验证逻辑，验证代码重复
2. **模块化支持有限**：按操作类型组织，不强制模块化，容易写出耦合代码
3. **需要显式类型注解**：Resolver 对象需要添加 `InferResolvers` 类型注解

## 4. 内置功能 (Built-in Features)

### 功能支持概览

Garph 在核心功能（Context、DataLoader、Subscriptions、Custom Scalars）方面提供原生支持，但在高级功能（Directives、Middleware、Query Complexity、Depth Limiting）方面支持有限。

### 功能支持详情表

| 功能                               | 支持状态        | 实现方式          | 证据/说明                                                                                                        |
| :--------------------------------- | :-------------- | :---------------- | :--------------------------------------------------------------------------------------------------------------- |
| **指令（Directives）**             | ⛔ 无法实现      | 不支持            | 官方文档（`garph/www/docs/guide/schemas.md` 第 252 行）明确说明 "Currently not supported"，参考 GitHub issue #40 |
| **扩展（Extensions）**             | ⚠️ 插件/额外实现 | 通过 GraphQLError | `garph/examples/errors.ts`（第 17 行）展示通过 `GraphQLError` 的 `extensions` 参数实现，但不是原生 API           |
| **批量加载（DataLoader）**         | ✅ 内置支持      | 原生内置          | `garph/src/schema.ts`（第 193-220 行）原生支持 `load` 和 `loadBatch` 方法，几乎无样板代码                        |
| **自定义标量（Scalars）**          | ✅ 内置支持      | 原生内置          | `garph/examples/scalars.ts`（第 5 行）通过 `g.scalarType()` 定义，API 直观且类型安全                             |
| **订阅（Subscription）**           | ✅ 内置支持      | 原生内置          | `garph/examples/subscriptions.ts`（第 9-33 行）原生支持，通过 async generator 实现                               |
| **上下文（Context）**              | ✅ 内置支持      | 原生内置          | `garph/examples/context.ts`（第 15-17 行）原生支持，类型推导完善，IDE 提示良好                                   |
| **中间件（Middleware）**           | ⛔ 无法实现      | 不支持            | 未找到相关支持，无法在 Resolver 执行前后注入中间件逻辑                                                           |
| **查询复杂度（Query Complexity）** | ⛔ 无法实现      | 不支持            | 未找到相关支持，无法防止复杂查询攻击                                                                             |
| **深度限制（Depth Limiting）**     | ⛔ 无法实现      | 不支持            | 未找到相关支持，无法防止深度查询攻击                                                                             |

### 详细分析

#### 4.1 指令支持（Directives）

**状态：⛔ 无法实现**

**证据**：
- 官方文档（`garph/www/docs/guide/schemas.md` 第 252 行）明确说明 "Currently not supported"
- 参考 GitHub issue #40：https://github.com/stepci/garph/issues/40

**分析**：
- ❌ 完全不支持 Directives 定义
- ❌ 无法通过任何方式实现 Directives 功能
- ⚠️ 这是一个已知的限制，可能在未来版本中支持

#### 4.2 扩展支持（Extensions）

**状态：⚠️ 插件/额外实现**

**证据**：
- `garph/examples/errors.ts`（第 17 行）展示通过 `GraphQLError` 的 `extensions` 参数实现
- `garph/www/docs/advanced/errors.md`（第 28-43 行）展示错误扩展的使用方式

**代码示例**：
```typescript
throw new GraphQLError('Expected error with extensions', {
  extensions: { code: 'EXPECTED_ERROR' }
})
```

**分析**：
- ⚠️ 不内置支持 Extensions 的原生 API
- ⚠️ 可以通过 `GraphQLError` 的 `extensions` 参数实现，但需要手动处理
- ⚠️ 无法声明查询复杂度、执行时间等扩展信息

#### 4.3 批量加载（DataLoader）集成

**状态：✅ 内置支持**

**证据**：
- `garph/src/schema.ts`（第 193-220 行）的 `addResolver` 函数自动处理 `load` 和 `loadBatch` 方法
- `garph/examples/loader.ts`（第 34-44 行）展示只需定义 `load` 函数，无需配置 Context 或创建 DataLoader 实例
- 使用 `single-user-cache` 实现 DataLoader 功能

**代码示例**：
```typescript
Dog: {
  owner: {
    load(queries) {  // 自动批量加载，支持缓存
      return Promise.resolve(
        queries.map(q => owners[q.parent.name])
      )
    }
  }
}
```

**分析**：
- ✅ 原生内置支持，无需安装额外插件
- ✅ 几乎无样板代码，只需定义 `load` 函数
- ✅ 自动批量处理，支持缓存控制（`load` 支持缓存，`loadBatch` 不支持）

#### 4.4 自定义标量（Scalars）

**状态：✅ 内置支持**

**证据**：
- `garph/examples/scalars.ts`（第 5 行）展示通过 `g.scalarType()` 定义自定义标量
- `typescript-graphql-schemas/garph/src/schema.ts`（第 9-13 行）展示 DateTime 标量的定义
- `garph/src/index.ts`（第 435-451 行）定义了 `GScalar` 类和 `scalarType` 方法

**代码示例**：
```typescript
const DateTime = g.scalarType<Date, Date>('DateTime', {
  serialize: (value) => GraphQLDateTime.serialize(value),
  parseValue: (value) => GraphQLDateTime.parseValue(value) as Date,
  parseLiteral: (ast) => GraphQLDateTime.parseLiteral(ast, {}) as Date,
})
```

**分析**：
- ✅ 定义新标量类型简便，API 直观
- ✅ 类型安全，支持泛型参数指定输入输出类型
- ⚠️ 不内置常用标量（如 DateTime、JSON、BigInt），需要手动定义或使用第三方库（如 `graphql-scalars`）

#### 4.5 订阅（Subscription）

**状态：✅ 内置支持**

**证据**：
- `garph/examples/subscriptions.ts`（第 9-33 行）展示原生支持 Subscriptions
- `garph/src/index.ts`（第 135-139 行）的 `InferResolvers` 类型支持 Subscription 类型
- 通过 async generator 实现实时数据推送

**代码示例**：
```typescript
const subscriptionType = g.type('Subscription', {
  counter: g.int(),
})

const resolvers: InferResolvers<{ Subscription: typeof subscriptionType }, {}> = {
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

**分析**：
- ✅ 原生支持 GraphQL Subscriptions
- ✅ 支持实时数据推送，通过 async generator 实现
- ✅ 底层传输协议兼容性好（通过 graphql-yoga 支持 WebSocket、SSE 等）
- ✅ API 简洁，类型安全

#### 4.6 上下文（Context）注入

**状态：✅ 内置支持**

**证据**：
- `garph/examples/context.ts`（第 9-26 行）展示 Context 的使用方式
- `garph/src/index.ts`（第 134-154 行）的 `InferResolvers` 类型支持 Context 类型参数
- `garph/www/docs/advanced/context.md` 提供完整的 Context 使用文档

**代码示例**：
```typescript
const context = () => {
  return {
    hello: 'world'
  }
}

const resolvers: InferResolvers<
  { Query: typeof queryType },
  { context: YogaInitialContext & ReturnType<typeof context> }
> = {
  Query: {
    context: (parent, args, context, info) => `Context: ${context.hello}`
  }
}

const yoga = createYoga({ schema, context })
```

**分析**：
- ✅ 原生支持在 Resolver 中注入上下文
- ✅ 上下文的类型推导完善，通过 `InferResolvers` 的第二个类型参数指定
- ✅ IDE 提示良好，无需手动类型声明
- ✅ 支持扩展默认 Context（如 `YogaInitialContext`）

#### 4.7 中间件（Middleware）

**状态：⛔ 无法实现**

**证据**：
- 未找到相关支持文档或示例
- `garph/src/schema.ts` 和 `garph/src/index.ts` 中未找到中间件相关代码

**分析**：
- ❌ 完全不支持中间件机制
- ❌ 无法在 Resolver 执行前后注入逻辑（如日志记录、权限检查、性能监控）
- ⚠️ 可以通过手动包装 Resolver 实现类似功能，但需要额外样板代码

#### 4.8 查询复杂度分析（Query Complexity）

**状态：⛔ 无法实现**

**证据**：
- 未找到相关支持文档或示例
- 未找到查询复杂度计算和分析的相关代码

**分析**：
- ❌ 完全不支持查询复杂度分析
- ❌ 无法防止复杂查询攻击
- ⚠️ 可以通过 graphql-yoga 的插件实现，但需要额外配置

#### 4.9 深度限制（Depth Limiting）

**状态：⛔ 无法实现**

**证据**：
- 未找到相关支持文档或示例
- 未找到深度限制的相关代码

**分析**：
- ❌ 完全不支持深度限制
- ❌ 无法防止深度查询攻击
- ⚠️ 可以通过 graphql-yoga 的插件实现，但需要额外配置

### 内置功能综合评分

**得分：<-待评分->**

**评分依据**：
- 核心功能支持良好：Context、DataLoader、Subscriptions、Custom Scalars 都提供原生支持
- 高级功能支持有限：Directives、Middleware、Query Complexity、Depth Limiting 都不支持
- 功能完整性：9 个功能中，4 个内置支持，1 个插件/额外实现，4 个无法实现

**优势**：
1. **核心功能完善**：Context、DataLoader、Subscriptions、Custom Scalars 都提供原生支持
2. **类型安全**：所有支持的功能都有完善的类型推导
3. **API 简洁**：支持的功能 API 直观易用

**劣势**：
1. **高级功能缺失**：Directives、Middleware、Query Complexity、Depth Limiting 都不支持
2. **安全功能不足**：无法防止复杂查询攻击和深度查询攻击
3. **扩展性有限**：缺乏中间件机制，难以实现横切关注点

## 5. 生态集成 (Ecosystem Integration)

### 核心集成策略

Garph 采用 **标准 GraphQL Schema 输出 + 手动集成** 的策略。通过 `buildSchema()` 输出标准 `GraphQLSchema`，可以与任何 GraphQL Server 集成，但需要手动适配。主要展示与 `graphql-yoga` 的集成，其他 Server 和框架需要通过标准 GraphQL Server 集成。

### 评分详情

#### 5.1 ORM 集成深度（ORM Integration Depth）

**得分：<-待评分->**

**证据**：
- **无官方插件**：未找到 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- **需要手动集成**：`typescript-graphql-schemas/garph/src/schema.ts` 中所有数据库操作都是手动实现（使用内存 Map）
- **类型同步需手动维护**：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步

**代码示例**：
```typescript
// 需要手动定义 GraphQL 类型
const UserType = g.type('User', {
  id: g.int(),
  name: g.string(),
  email: g.string(),
})

// 需要手动实现数据库查询
const resolvers: InferResolvers<...> = {
  Query: {
    users: () => Array.from(userMap.values()),  // 手动查询
    user: (_, { id }) => userMap.get(id),      // 手动查询
  },
}
```

**分析**：
- ❌ 无官方插件：不提供 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- ❌ 需要大量胶水代码：必须手动编写所有数据库查询逻辑
- ❌ 类型同步需手动维护：ORM 模型定义与 GraphQL Schema 定义分离
- ⚠️ 可以手动集成：虽然可以手动集成 ORM，但需要大量样板代码

#### 5.2 验证库集成（Validation Library Integration）

**得分：<-待评分->**

**证据**：
- **支持 Zod，但需手动集成**：`garph/www/docs/advanced/validation.md`（第 35-70 行）展示使用 Zod 验证，但需要在 Scalar 的 `parseValue` 中手动调用
- **验证逻辑与 Schema 定义分离**：验证规则无法直接在 Schema 定义中声明，需要创建独立的 Scalar 类型
- **需要手动同步类型**：验证规则与类型定义分离，需要手动维护同步

**代码示例**：
```typescript
// 需要手动创建 Scalar 并调用 Zod
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

**分析**：
- ❌ 无原生支持：不提供声明式验证 API（如 `.refine()` 或 `validate` 选项）
- ❌ 验证逻辑与 Schema 定义分离：需要在 Scalar 中手动调用验证库
- ❌ 需要大量样板代码：每个验证场景都需要创建独立的 Scalar 类型
- ⚠️ 可以手动集成：虽然可以手动集成 Zod，但需要大量样板代码

#### 5.3 GraphQL Server 兼容性（Server Compatibility）

**得分：<-待评分->**

**证据**：
- **输出标准 GraphQL Schema**：`garph/src/schema.ts`（第 17-21 行）的 `buildSchema()` 函数输出标准 `GraphQLSchema`
- **与标准 GraphQL.js 兼容**：使用 `graphql-compose` 构建 Schema，最终输出标准 GraphQL Schema
- **主要展示 graphql-yoga**：`garph/www/docs/integration/server/graphql-yoga.md` 提供详细集成文档
- **支持其他 Server**：`garph/www/docs/integration/server/apollo-server.md` 和 `mercurius.md` 存在（虽然内容不完整）

**代码示例**：
```typescript
// 输出标准 GraphQL Schema
const schema = buildSchema({ g, resolvers })

// 可以与任何 GraphQL Server 集成
const yoga = createYoga({ schema })  // graphql-yoga
// 或
const server = new ApolloServer({ schema })  // Apollo Server
```

**分析**：
- ✅ 与标准 GraphQL.js 兼容：输出标准 `GraphQLSchema`，可以集成到任何 GraphQL Server
- ✅ 不绑定特定 Server：可以与 Apollo Server、GraphQL Yoga、Envelop、Hono 等集成
- ⚠️ 需要手动适配：虽然兼容，但需要手动适配，没有提供官方适配器
- ⚠️ 文档主要展示 graphql-yoga：其他 Server 的集成文档不完整

#### 5.4 Web 框架适配（Web Framework Adapter）

**得分：<-待评分->**

**证据**：
- **通过 GraphQL Server 集成**：`garph/www/docs/integration/examples/nextjs.md` 展示通过 graphql-yoga 集成到 Next.js
- **有示例但无官方适配器**：提供 Next.js、Nuxt、Remix 的示例，但都是通过 graphql-yoga 集成
- **需要手动配置**：`typescript-graphql-schemas/garph/src/server.ts` 展示需要手动创建 HTTP Server

**代码示例**：
```typescript
// 通过 graphql-yoga 集成
const schema = buildSchema({ g, resolvers })
const yoga = createYoga({ schema })
const server = createServer(yoga)  // 手动创建 HTTP Server
server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})
```

**分析**：
- ✅ 可以通过标准 GraphQL Server 集成：通过 graphql-yoga 可以集成到任何 Web 框架
- ⚠️ 需要手动配置：需要手动创建 HTTP Server 或通过 graphql-yoga 集成
- ⚠️ 无官方适配器：不提供 Express、Fastify、Hono、Koa 等的官方适配器
- ⚠️ 集成文档有限：主要提供 Next.js、Nuxt、Remix 的示例，其他框架需要自行适配

### 生态集成综合评分

**得分：<-待评分->**

**评分依据**：
- ORM 集成深度：<-待评分->（弱集成，需要大量胶水代码）
- 验证库集成：<-待评分->（弱集成，需要大量样板代码）
- GraphQL Server 兼容性：<-待评分->（标准兼容，但需要手动适配）
- Web 框架适配：<-待评分->（标准集成，但需要手动配置）

**优势**：
1. **标准兼容**：输出标准 GraphQL Schema，可以与任何 GraphQL Server 集成
2. **不绑定特定 Server**：可以与 Apollo Server、GraphQL Yoga、Envelop 等集成
3. **有示例参考**：提供 Next.js、Nuxt、Remix 的集成示例

**劣势**：
1. **ORM 集成弱**：无官方插件，需要大量胶水代码
2. **验证库集成弱**：需要手动集成，验证逻辑与 Schema 定义分离
3. **无官方适配器**：不提供 Web 框架的官方适配器，需要手动配置
4. **集成文档有限**：主要展示 graphql-yoga，其他 Server 和框架的文档不完整

## 📝 总结

### 综合评分

**总分：<-待评分->**

**各维度得分**：
- 架构模式：<-待评分->
- 类型定义：<-待评分->
- 解析器与验证：<-待评分->
- 内置功能：<-待评分->
- 生态集成：<-待评分->

### 核心优势

1. **零魔法架构**：采用 Builder 模式，完全符合原生 TypeScript 最佳实践，无需装饰器、反射或代码生成
2. **类型推断强大**：通过 `Infer` 和 `InferResolvers` 实现端到端类型安全，从 Schema 定义自动推断 TypeScript 类型
3. **开发体验优秀**：即写即用，支持热重载，链式 API 直观，IDE 支持完善
4. **核心功能完善**：Context、DataLoader、Subscriptions、Custom Scalars 都提供原生支持，几乎无样板代码
5. **标准兼容**：输出标准 GraphQL Schema，可以与任何 GraphQL Server 集成

### 主要劣势

1. **高级功能缺失**：不支持 Directives、Middleware、Query Complexity、Depth Limiting 等高级功能
2. **验证集成弱**：无内置验证，需要手动集成验证库，验证逻辑与 Schema 定义分离
3. **ORM 集成弱**：无官方插件，需要大量胶水代码，类型同步需手动维护
4. **模块化支持有限**：按操作类型组织，不强制模块化，容易写出耦合代码
5. **生态集成有限**：无官方适配器，需要手动配置，集成文档不完整

### 适用场景

**推荐使用**：
- 需要零魔法、原生 TypeScript 体验的项目
- 中小型项目，不需要复杂的高级功能
- 需要快速原型开发，重视开发体验
- 使用 graphql-yoga 作为 GraphQL Server

**不推荐使用**：
- 需要 Directives、Middleware 等高级功能的项目
- 需要深度 ORM 集成的项目（如 Prisma、Drizzle）
- 需要声明式验证的项目
- 大型项目，需要强制模块化组织

### 改进建议

1. **增强验证集成**：提供声明式验证 API，支持从验证规则自动推导类型
2. **提供 ORM 插件**：开发官方插件支持主流 ORM（Prisma、Drizzle、TypeORM）
3. **支持 Directives**：实现 Directives 定义和使用功能（参考 GitHub issue #40）
4. **增强模块化**：提供领域模块化 API，强制按领域组织代码
5. **完善生态集成**：提供官方适配器支持主流 Web 框架，完善集成文档

---

**评估日期**：2026年1月  
**评估版本**：garph@0.6.8  
**评估方法**：基于实际业务代码和官方示例的深度源码审计
