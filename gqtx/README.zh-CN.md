# gqtx 评估报告 (2026 年 1 月)

> 本报告基于实际业务代码 (`typescript-graphql-schemas/gqtx/src`) 及官方示例 (`@gqtx/examples`) 生成。

## 📋 基本信息
| 项目         | 内容                            |
| :----------- | :------------------------------ |
| **当前版本** | 0.9.3                           |
| **GitHub**   | https://github.com/sikanhe/gqtx |
| **文档站**   | GitHub README                   |
| **初次提交** | 2019-10-12                      |
| **最近提交** | 2024-01-05                      |

## 📊 综合评分
| 维度                | 得分 (1-5) | 简评                                              |
| :------------------ | :--------- | :------------------------------------------------ |
| **1. 架构模式**     | **5.0**    | 极简依赖、纯运行时构建、零魔法、完全中立          |
| **2. 类型定义**     | **1.5**    | 逻辑关联、显式注册、需要手动维护同步              |
| **3. 解析器与验证** | **1.8**    | 参数类型可推断，但无模块化、无验证、无 DataLoader |
| **4. 内置功能**     | **2.8**    | 核心功能完善，但高级功能缺失                      |
| **5. 生态集成**     | **2.5**    | GraphQL Server 兼容性佳，但 ORM 和验证库集成缺失  |

---

## 1. 架构模式 (Architecture)

### 1.1 架构模式概述

`gqtx` 采用 **Builder（构建器）模式**，通过函数式 API 显式构建 GraphQL Schema 的中间表示（Intermediate Representation），然后在运行时通过 `buildGraphQLSchema()` 转换为标准的 `graphql-js` Schema。

**核心设计理念**（来自 `WHY.md`）：
- 避免手动类型转换带来的错误
- 无需代码生成工具和 SDL 文件
- 不依赖装饰器、反射元数据等"魔法"

### 1.2 依赖复杂度 (Dependency Complexity)

**评分：5.0**

**证据：**
- **运行时依赖**：仅 `graphql` 作为 `peerDependency`（`package.json:58-60`）
- **零运行时开销**：无装饰器、无 `reflect-metadata`、无第三方运行时依赖
- **构建依赖**：仅用于打包（Rollup + TypeScript），不影响运行时

```json
// package.json
"peerDependencies": {
  "graphql": "^16.7.0"
}
```

**对比实际业务代码**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
- 业务代码仅导入 `gqtx` 和 `graphql`，无额外依赖
- 使用 `graphql-scalars` 作为可选增强（非框架要求）

### 1.3 构建流程 (Build Flow)

**评分：5.0**

**证据：**
- **纯运行时构建**：通过 `buildGraphQLSchema()` 在服务器启动时构建（`src/build.ts:16-44`）
- **无需代码生成**：不需要 CLI 工具、不需要生成类型文件
- **无需构建步骤**：开发时直接运行 TypeScript 代码即可

**实际使用示例**（`typescript-graphql-schemas/gqtx/src/schema.ts:450`）：
```typescript
export const schema = buildGraphQLSchema({ query, mutation })
```

**构建过程**（`src/build.ts`）：
1. 接收中间表示（`Schema<RootSrc>`）
2. 通过 `toGraphQLOutputType()` 递归转换类型
3. 使用 `Map` 缓存已转换的类型，避免重复构建
4. 返回标准 `graphql.GraphQLSchema` 实例

**框架自身构建**（`rollup.config.js`）：
- 仅用于发布时的打包（ESM + CJS 双格式）
- 不影响用户使用，用户无需关心框架的构建过程

### 1.4 配置魔法 (Config & Language Magic)

**评分：5.0**

**证据：**
- **零魔法**：不使用装饰器、反射元数据、非标准 TS 语法
- **函数式 API**：通过 `Gql.Object()`, `Gql.Field()`, `Gql.Enum()` 等函数显式定义
- **类型推断**：利用 TypeScript 泛型和条件类型实现类型安全（`src/define.ts:158-185`）

**类型安全实现**（`src/define.ts:158-185`）：
```typescript
export function Field<Key extends string, Src, Out, Arg extends object = {}>({
  name,
  type,
  resolve,
  args,
  ...options
}: {
  name: Key;
  type: OutputType<Out>;
  args?: ArgMap<Arg>;
  // 条件类型确保 resolve 函数签名与类型定义一致
} & (Key extends keyof Src
  ? Src[Key] extends Out
    ? ResolvePartialOptional<Src, Arg, Out>
    : ResolvePartialMandatory<Src, Arg, Out>
  : ResolvePartialMandatory<Src, Arg, Out>))
```

**Context 类型扩展**（`src/types.ts:6`）：
- 通过 TypeScript 模块扩展（Module Augmentation）实现全局 Context 类型
- 无需配置，符合 TypeScript 标准实践

**实际使用**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
- 所有类型定义都是显式的函数调用
- 无需任何配置文件或特殊编译选项

### 1.5 生态集成 (Ecosystem Integration)

**评分：5.0**

**证据：**
- **完全中立**：生成标准 `graphql-js` Schema，可与任何 GraphQL Server 集成
- **标准安装**：通过 `npm install gqtx` 即可使用，无特殊要求
- **灵活集成**：支持 Express、GraphQL Yoga、Apollo Server 等

**官方示例集成**（`examples/starwars.ts:365-378`）：
```typescript
import express from 'express';
import graphqlHTTP from 'express-graphql';

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildGraphQLSchema(schema),
    graphiql: true,
  })
);
```

**实际业务集成**（`typescript-graphql-schemas/gqtx/src/server.ts`）：
```typescript
import { createYoga } from 'graphql-yoga'
import { schema } from './schema.ts'

const yoga = createYoga({ schema })
```

**框架源码验证**（`src/build.ts:16-44`）：
- `buildGraphQLSchema()` 返回标准 `graphql.GraphQLSchema`
- 完全兼容 `graphql-js` 生态系统

### 1.6 架构模式总结

| 评估项         | 得分    | 说明                                   |
| :------------- | :------ | :------------------------------------- |
| **依赖复杂度** | **5.0** | 仅依赖 `graphql`，零运行时开销         |
| **构建流程**   | **5.0** | 纯运行时构建，无需代码生成             |
| **配置魔法**   | **5.0** | 零魔法，完全符合原生 TS 实践           |
| **生态集成**   | **5.0** | 完全中立，可与任何 GraphQL Server 集成 |

**综合得分：5.0**

**优势：**
- 极简依赖，无运行时开销
- 即写即用，无需构建步骤
- 零魔法，符合 TypeScript 最佳实践
- 完全中立，生态兼容性极佳

**劣势：**
- 需要显式定义所有类型（相比自动推断的框架，代码量稍多）
- 不支持 SDL-first 开发模式（对偏好 SDL 的团队不友好）

## 2. 类型定义 (Type Definition)

### 2.1 单一数据源（Single Source of Truth）实现度

**评分：2.0 - 逻辑关联**

**证据：**
- **TypeScript 类型与 GraphQL 类型分离定义**：需要先定义 TypeScript 类型，然后定义 GraphQL 类型（`typescript-graphql-schemas/gqtx/src/schema.ts:10-41, 106-187`）
- **字段需要手动重复声明**：实现接口时必须手动重复声明所有公共字段（`schema.ts:123-146`）

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 步骤 1：定义 TypeScript 类型
type Coffee = {
  __typename: 'Coffee'
  id: number
  name: string
  price: number
  sugarLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  origin: string
}

// 步骤 2：定义 GraphQL Interface
const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})

// 步骤 3：定义 GraphQL Object（需要手动重复接口字段）
const CoffeeType = Gql.Object<Coffee>({
  name: 'Coffee',
  interfaces: [FoodInterface],
  fields: () => [
    // ⚠️ 必须手动重复声明接口字段
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    // 特有字段
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})
```

**分析：**
- ✅ **类型安全**：通过泛型 `<Coffee>` 绑定 TypeScript 类型，确保类型一致性
- ✅ **逻辑关联**：TypeScript 类型与 GraphQL 类型通过泛型参数绑定，类型系统能检查一致性
- ❌ **字段重复**：实现接口时必须手动重复声明所有接口字段，无法自动继承
- ❌ **无自动同步**：修改 TypeScript 类型后，需要手动同步 GraphQL 类型定义
- ❌ **无验证集成**：无法从验证规则（如 Zod）自动生成类型定义

**对比框架源码**（`gqtx/src/build.ts:182-213`）：
- 框架在构建时会合并接口字段到实现类型（`interfaces: (typeof t.interfaces === 'function' ? t.interfaces() : t.interfaces).map(...)`）
- 但定义时仍需手动声明，运行时才会合并

### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**评分：2.0 - 显式注册**

**证据：**
- **需要手动映射**：必须通过 `Gql.Enum()` 显式注册每个枚举值（`schema.ts:64-83`）
- **不支持直接使用 TypeScript Enum**：需要手动映射每个值
- **字符串联合类型需要手动映射**：无法直接使用 `'A' | 'B'` 类型

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts:64-83`）：
```typescript
// TypeScript 类型定义
type Coffee = {
  sugarLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'  // 字符串联合类型
  // ...
}

// 必须手动映射每个值
const SugarLevelEnum = Gql.Enum({
  name: 'SugarLevel',
  description: 'Sugar level for coffee',
  values: [
    { name: 'NONE', value: 'NONE' },
    { name: 'LOW', value: 'LOW' },
    { name: 'MEDIUM', value: 'MEDIUM' },
    { name: 'HIGH', value: 'HIGH' },
  ],
})

// 使用 TypeScript Enum 也需要手动映射（examples/starwars.ts:147-155）
enum Episode {
  NEWHOPE = 4,
  EMPIRE = 5,
  JEDI = 6,
}

const episodeEnum = Gql.Enum({
  name: 'Episode',
  values: [
    { name: 'NEWHOPE', value: Episode.NEWHOPE },
    { name: 'EMPIRE', value: Episode.EMPIRE },
    { name: 'JEDI', value: Episode.JEDI },
  ],
})
```

**分析：**
- ✅ **类型安全**：枚举值在 TypeScript 和 GraphQL 中完全同步
- ✅ **显式控制**：可以精确控制每个枚举值的名称和值
- ❌ **手动映射**：需要为每个枚举值手动编写映射代码
- ❌ **无自动推断**：无法从 TypeScript Enum 或字符串联合类型自动生成 GraphQL Enum
- ❌ **维护成本**：添加新枚举值需要同时修改 TypeScript 类型和 GraphQL 定义

**对比测试用例**（`gqtx/test/simple.spec.ts:146-154`）：
- 测试用例同样需要手动映射枚举值
- 框架不提供自动推断机制

### 2.3 接口继承与联合类型体验（Interface & Union）

**评分：2.0 - 逻辑决议**

**证据：**
- **接口字段需要手动重复声明**：实现接口时必须手动重复声明所有公共字段（`schema.ts:123-146`）
- **Union 类型需要手动实现 resolveType**：必须手动编写类型决议逻辑（`schema.ts:148-155`）
- **需要手动添加 __typename**：Union 类型的数据必须包含 `__typename` 字段（`schema.ts:16-17, 26-27`）

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// Interface 定义
const FoodInterface = Gql.InterfaceType({
  name: 'Food',
  fields: () => [
    Gql.AbstractField({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.AbstractField({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.AbstractField({ name: 'price', type: Gql.NonNull(Gql.Float) }),
  ],
})

// 实现接口（需要手动重复字段）
const CoffeeType = Gql.Object<Coffee>({
  name: 'Coffee',
  interfaces: [FoodInterface],
  fields: () => [
    // ⚠️ 必须手动重复声明接口字段
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'price', type: Gql.NonNull(Gql.Float) }),
    Gql.Field({ name: 'sugarLevel', type: Gql.NonNull(SugarLevelEnum) }),
    Gql.Field({ name: 'origin', type: Gql.NonNull(Gql.String) }),
  ],
})

// Union 类型定义（需要手动实现 resolveType）
const MenuItemType = Gql.Union({
  name: 'MenuItem',
  types: [CoffeeType, DessertType],
  resolveType: (value: MenuItem) => {
    // ⚠️ 必须手动实现类型决议逻辑
    return value.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})

// TypeScript 类型必须包含 __typename（schema.ts:16-17, 26-27）
type Coffee = {
  __typename: 'Coffee'  // ⚠️ 必须手动添加
  // ...
}
```

**分析：**
- ✅ **支持抽象类型**：支持 Interface 和 Union 类型
- ✅ **类型安全**：通过泛型确保类型一致性
- ❌ **手动重复字段**：实现接口时必须手动重复声明所有公共字段
- ❌ **手动类型决议**：Union 类型需要手动实现 `resolveType` 函数
- ❌ **需要 __typename**：数据必须包含 `__typename` 字段，需要手动维护

**对比框架源码**（`gqtx/src/build.ts:186-189`）：
- 框架在构建时会合并接口字段（`interfaces: ...map((intf) => toGraphQLOutputType(intf, typeMap))`）
- 但定义时仍需手动声明，运行时才会合并

**对比官方示例**（`gqtx/examples/starwars.ts:157-170, 239-282`）：
- 官方示例同样需要手动重复接口字段
- Union 类型同样需要手动实现 `resolveType`

### 2.4 类型推断强度与显式声明平衡

**评分：2.0 - 按需标注**

**证据：**
- **基础类型可推断**：通过泛型参数 `<User>` 可以推断基础类型
- **字段类型需要显式声明**：每个字段的类型必须显式声明（`schema.ts:110-112`）
- **参数类型可推断**：Resolver 的参数类型可以自动推断（`src/define.ts:158-185`）
- **数组和可空性需要显式声明**：需要使用 `Gql.List()`, `Gql.NonNull()` 显式声明

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 基础类型推断（通过泛型参数）
const UserType = Gql.Object<User>({  // ✅ User 类型自动推断
  name: 'User',
  fields: () => [
    // ⚠️ 字段类型需要显式声明
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
  ],
})

// 参数类型自动推断（src/define.ts:158-185）
Gql.Field({
  name: 'user',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
  },
  resolve: (_, { id }) => {  // ✅ id 类型自动推断为 number
    // ...
  },
})

// 数组和可空性需要显式声明
Gql.Field({
  name: 'users',
  type: Gql.NonNull(Gql.List(Gql.NonNull(UserType))),  // ⚠️ 需要显式声明
  resolve: () => Array.from(userMap.values()),
})
```

**类型安全实现**（`gqtx/src/define.ts:158-185`）：
```typescript
export function Field<Key extends string, Src, Out, Arg extends object = {}>({
  name,
  type,
  resolve,
  args,
  ...options
}: {
  name: Key;
  type: OutputType<Out>;
  args?: ArgMap<Arg>;
  // 条件类型确保 resolve 函数签名与类型定义一致
} & (Key extends keyof Src
  ? Src[Key] extends Out
    ? ResolvePartialOptional<Src, Arg, Out>  // 字段存在且类型匹配，resolve 可选
    : ResolvePartialMandatory<Src, Arg, Out>  // 字段不存在或类型不匹配，resolve 必填
  : ResolvePartialMandatory<Src, Arg, Out>))
```

**分析：**
- ✅ **参数类型自动推断**：Resolver 的参数类型可以自动推断，无需手动声明
- ✅ **返回值类型检查**：通过条件类型确保 resolve 函数的返回值类型与字段类型一致
- ✅ **字段存在性检查**：如果字段名存在于源类型中，resolve 函数可选
- ⚠️ **字段类型需要显式声明**：每个字段的类型必须显式声明，无法从 TypeScript 类型自动推断
- ⚠️ **数组和可空性需要显式声明**：需要使用 `Gql.List()`, `Gql.NonNull()` 显式声明

### 2.5 类型定义总结

| 评估项         | 得分    | 说明                                                       |
| :------------- | :------ | :--------------------------------------------------------- |
| **单一数据源** | **2.0** | TypeScript 类型与 GraphQL 类型逻辑关联，但需要手动维护同步 |
| **枚举支持**   | **2.0** | 需要显式注册，不支持自动推断                               |
| **接口继承**   | **2.0** | 支持接口，但需要手动重复声明字段                           |
| **联合类型**   | **2.0** | 支持 Union，但需要手动实现 resolveType                     |
| **类型推断**   | **2.0** | 参数类型可推断，字段类型需要显式声明                       |

**综合得分：1.5**

**优势：**
- 类型安全：通过泛型和条件类型确保类型一致性
- 参数类型自动推断：Resolver 的参数类型可以自动推断
- 显式控制：所有类型定义都是显式的，易于理解和调试

**劣势：**
- 字段重复：实现接口时必须手动重复声明所有公共字段
- 手动映射：枚举和 Union 类型需要手动映射和实现
- 无自动同步：修改 TypeScript 类型后，需要手动同步 GraphQL 类型定义
- 维护成本：需要同时维护 TypeScript 类型和 GraphQL 定义

## 3. 解析器与验证 (Resolvers & Validation)

### 3.1 开发体验（代码简洁度）

**评分：3.0 - 代码量中等**

**证据：**
- **需要显式定义所有字段**：每个字段都需要通过 `Gql.Field()` 显式定义（`typescript-graphql-schemas/gqtx/src/schema.ts:195-246`）
- **参数类型自动推断**：Resolver 的参数类型可以自动推断（`schema.ts:206, 258`）
- **验证逻辑手动编写**：所有验证逻辑都需要在 Resolver 中手动编写（`schema.ts:259, 400-404`）

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// Query 定义（需要显式定义每个字段）
const query = Gql.Query({
  fields: () => [
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
      resolve: (_, { id }) => {  // ✅ id 类型自动推断为 number
        const user = userMap.get(id)
        if (!user) throw new GraphQLError('User not found')
        return user
      },
    }),
  ],
})

// Mutation 定义（验证逻辑需要手动编写）
const mutation = Gql.Mutation({
  fields: () => [
    Gql.Field({
      name: 'createUser',
      type: Gql.NonNull(UserType),
      args: {
        name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
        email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
      },
      resolve: (_, { name, email }) => {
        // ⚠️ 验证逻辑需要手动编写
        if (!email.includes('@')) throw new GraphQLError('Invalid email format')
        const id = incrementId()
        const newUser: User = { id, name, email }
        userMap.set(id, newUser)
        return newUser
      },
    }),
  ],
})
```

**代码量分析**：
- 完整的 User 模块（Query + Mutation + Field Resolver）约需 150+ 行代码
- 每个字段都需要显式定义类型和 resolver
- 验证逻辑分散在各个 Resolver 中

**分析：**
- ✅ **参数类型自动推断**：Resolver 的参数类型可以自动推断，无需手动声明
- ✅ **类型安全**：通过条件类型确保 resolve 函数签名与类型定义一致（`src/define.ts:158-185`）
- ⚠️ **需要显式定义字段**：每个字段都需要通过 `Gql.Field()` 显式定义，代码量较多
- ⚠️ **验证逻辑手动编写**：所有验证逻辑都需要在 Resolver 中手动编写，无法声明式定义

### 3.2 模块化设计（领域驱动开发支持）

**评分：0.0 - 无模块化考虑**

**证据：**
- **按操作类型组织**：所有 Query 和 Mutation 都在一个对象中，按操作类型组织（`schema.ts:193-247, 249-444`）
- **无强制模块边界**：没有强制性的模块边界，所有 Resolver 都在同一个文件中
- **容易写出耦合代码**：如果不注意，容易将所有领域的 Query/Mutation/Field Resolver 都写在一个文件中

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 所有 Query 都在一个对象中，按操作类型组织
const query = Gql.Query({
  fields: () => [
    // User 相关
    Gql.Field({ name: 'users', /* ... */ }),
    Gql.Field({ name: 'user', /* ... */ }),
    // Menu 相关
    Gql.Field({ name: 'menu', /* ... */ }),
    Gql.Field({ name: 'menuItem', /* ... */ }),
    // Order 相关
    Gql.Field({ name: 'orders', /* ... */ }),
    Gql.Field({ name: 'order', /* ... */ }),
  ],
})

// 所有 Mutation 都在一个对象中
const mutation = Gql.Mutation({
  fields: () => [
    // User 相关
    Gql.Field({ name: 'createUser', /* ... */ }),
    Gql.Field({ name: 'updateUser', /* ... */ }),
    // Menu 相关
    Gql.Field({ name: 'createCoffee', /* ... */ }),
    // Order 相关
    Gql.Field({ name: 'createOrder', /* ... */ }),
    // ... 所有 Mutation 混在一起
  ],
})
```

**文件结构**（`typescript-graphql-schemas/gqtx/src/`）：
- 所有代码都在 `schema.ts` 一个文件中（451 行）
- 没有按领域拆分文件
- 可以手动拆分，但框架不强制模块边界

**分析：**
- ❌ **完全按操作类型隔离**：`Query`、`Mutation` 分别组织，不是按领域组织
- ❌ **无强制模块边界**：没有强制性的模块边界，容易写出耦合的巨型文件
- ⚠️ **可以手动拆分**：虽然可以按领域拆分文件并手动组合，但框架不提供模块化 API
- ❌ **不支持 DDD**：缺乏强制性的模块边界，容易写出耦合代码

### 3.3 参数定义与类型推导

**评分：4.0 - 参数类型大部分自动推断**

**证据：**
- **参数定义在字段中**：参数通过 `args` 对象定义在字段中（`schema.ts:203-205, 254-257`）
- **参数类型自动推断**：Resolver 的参数类型可以自动推断（`schema.ts:206, 258`）
- **IDE 提示完善**：TypeScript 完全理解参数类型，IDE 自动补全正常工作

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 参数定义在字段中
Gql.Field({
  name: 'user',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
  },
  resolve: (_, { id }) => {  // ✅ id 类型自动推断为 number
    const user = userMap.get(id)
    if (!user) throw new GraphQLError('User not found')
    return user
  },
})

// 多个参数自动推断
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {  // ✅ name 和 email 类型自动推断
    // name: string, email: string
  },
})
```

**类型安全实现**（`gqtx/src/define.ts:121-143`）：
```typescript
export function Arg<
  Src,
  TDefault extends Exclude<Src, null | undefined> | undefined
>({
  type,
  description,
  default: defaultArg,
}: {
  type: InputType<Src>;
  description?: string;
  default?: TDefault;
}): Argument<
  TDefault extends undefined
    ? Exclude<Src, undefined>
    : Exclude<Src, null | undefined>
> {
  // 通过条件类型确保参数类型正确
}
```

**分析：**
- ✅ **参数类型大部分自动推断**：通过 `ArgMap` 和条件类型自动推断参数类型，无需手动声明
- ✅ **IDE 提示完善**：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- ✅ **类型安全**：参数类型与 Schema 定义完全同步
- ⚠️ **需要显式定义 args**：虽然类型可以推断，但需要在字段中显式定义 `args` 对象

### 3.4 输入验证机制

**评分：2.0 - 无内置验证，需要完全手动实现**

**证据：**
- **无内置验证**：`typescript-graphql-schemas/gqtx/src/schema.ts`（第 259, 400-404 行）所有验证逻辑都需要手动编写
- **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用
- **无声明式 API**：不提供类似 `.refine()` 的声明式验证 API

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 方式 1：在 Resolver 中手动验证（schema.ts:258-264）
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {
    // ⚠️ 验证逻辑需要手动编写
    if (!email.includes('@')) throw new GraphQLError('Invalid email format')
    const id = incrementId()
    const newUser: User = { id, name, email }
    userMap.set(id, newUser)
    return newUser
  },
})

// 方式 2：复杂验证逻辑（schema.ts:399-415）
Gql.Field({
  name: 'createOrder',
  type: Gql.NonNull(OrderType),
  args: {
    userId: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
    items: Gql.Arg({ type: Gql.NonNullInput(Gql.ListInput(Gql.NonNullInput(Gql.Int))) }),
  },
  resolve: (_, { userId, items }) => {
    // ⚠️ 所有验证逻辑都需要手动编写
    if (items.length === 0) throw new GraphQLError('At least one item is required')
    if (!userMap.has(userId)) throw new GraphQLError('User not found')
    for (const itemId of items) {
      if (!menuItemMap.has(itemId)) throw new GraphQLError(`Menu item not found`)
    }
    // ...
  },
})
```

**验证逻辑重复**：
- 邮箱验证在 `createUser` 和 `updateUser` 中重复（`schema.ts:259, 279`）
- 需要手动维护验证逻辑的一致性

**分析：**
- ❌ **无内置验证**：不提供声明式验证 API（如 `.refine()` 或 `@IsEmail()`）
- ❌ **验证逻辑重复**：需要在每个需要验证的地方手动编写验证代码
- ❌ **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用
- ❌ **无声明式 API**：不提供类似 `.refine()` 的声明式验证 API
- ⚠️ **可以通过 Scalar 实现**：理论上可以通过自定义 Scalar 的 `parseValue` 实现验证，但需要为每个验证场景创建独立的 Scalar 类型，增加了代码量

### 3.5 批量加载（DataLoader）集成

**评分：0.0 - 无内置支持**

**证据：**
- **无内置 DataLoader 支持**：框架源码中未找到 DataLoader 相关实现（`gqtx/src/` 目录下无 DataLoader 相关代码）
- **需要手动实现**：需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入

**代码示例**（需要手动实现）：
```typescript
// 需要手动安装和配置 DataLoader
import DataLoader from 'dataloader'
import { GqlContext } from 'gqtx'

// 扩展 Context 类型
declare module 'gqtx' {
  interface GqlContext {
    userLoader: DataLoader<number, User>
    orderLoader: DataLoader<number, Order>
  }
}

// 创建 DataLoader 实例
const userLoader = new DataLoader<number, User>(async (ids) => {
  return ids.map(id => userMap.get(id))
})

// 在 Resolver 中使用
Gql.Field({
  name: 'user',
  type: UserType,
  args: {
    id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
  },
  resolve: (_, { id }, ctx) => {
    return ctx.userLoader.load(id)  // 需要手动配置 Context
  },
})
```

**分析：**
- ❌ **无内置支持**：框架不提供任何 DataLoader 相关的 API 或工具
- ❌ **需要大量样板代码**：需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入
- ❌ **无自动批处理**：需要手动实现批处理逻辑
- ❌ **无缓存控制**：需要手动实现缓存逻辑

### 3.6 解析器与验证总结

| 评估项              | 得分       | 说明                                             |
| :------------------ | :--------- | :----------------------------------------------- |
| **开发体验**        | <-待评分-> | 代码量中等，参数类型可推断，但需要显式定义字段   |
| **模块化设计**      | <-待评分-> | 无模块化考虑，完全按操作类型组织，无强制模块边界 |
| **参数定义**        | <-待评分-> | 参数类型大部分自动推断，IDE 提示完善             |
| **输入验证**        | <-待评分-> | 无内置验证，需要完全手动实现，验证逻辑分散       |
| **DataLoader 集成** | <-待评分-> | 无内置支持，需要大量样板代码                     |

**综合得分：<-待评分->**

**优势：**
- 参数类型自动推断：Resolver 的参数类型可以自动推断，IDE 提示完善
- 类型安全：通过条件类型确保类型一致性
- 显式控制：所有定义都是显式的，易于理解和调试

**劣势：**
- 无模块化支持：完全按操作类型组织，无强制模块边界
- 无内置验证：所有验证逻辑都需要手动编写，验证逻辑分散
- 无 DataLoader 支持：需要手动实现，需要大量样板代码
- 代码量较多：需要显式定义所有字段，代码量相比其他框架较多

## 4. 内置功能 (Built-in Features)

### 功能支持概览

`gqtx` 在核心功能（Context、Subscriptions、Custom Scalars、Directives、Extensions）方面提供原生支持，但在高级功能（DataLoader、Middleware、Query Complexity、Depth Limiting）方面支持有限。

### 功能支持详情表

| 功能                               | 支持状态   | 实现方式 | 证据/说明                                                                                                         |
| :--------------------------------- | :--------- | :------- | :---------------------------------------------------------------------------------------------------------------- |
| **指令（Directives）**             | ✅ 内置支持 | 原生内置 | `gqtx/src/types.ts`（第 219 行）和 `src/build.ts`（第 43 行）支持通过 `directives` 参数传递 `GraphQLDirective[]`  |
| **扩展（Extensions）**             | ✅ 内置支持 | 原生内置 | `gqtx/src/define.ts`（第 25-32 行）和 `src/build.ts`（第 203, 209 行）支持在 Field 和 ObjectType 上定义扩展       |
| **批量加载（DataLoader）**         | ⛔ 无法实现 | 不支持   | 已在 Phase 4 详细评估，无内置支持，需要手动实现                                                                   |
| **自定义标量（Scalars）**          | ✅ 内置支持 | 原生内置 | `gqtx/src/define.ts`（第 79-102 行）通过 `Gql.Scalar()` 定义，API 直观且类型安全                                  |
| **订阅（Subscription）**           | ✅ 内置支持 | 原生内置 | `gqtx/src/define.ts`（第 377-424 行）和 `test/simple.spec.ts`（第 604-668 行）原生支持，通过 async generator 实现 |
| **上下文（Context）**              | ✅ 内置支持 | 原生内置 | `gqtx/src/types.ts`（第 6 行）通过模块扩展 `GqlContext` 接口，类型推导完善                                        |
| **中间件（Middleware）**           | ⛔ 无法实现 | 不支持   | 未找到相关支持，无法在 Resolver 执行前后注入中间件逻辑                                                            |
| **查询复杂度（Query Complexity）** | ⛔ 无法实现 | 不支持   | 未找到相关支持，无法防止复杂查询攻击                                                                              |
| **深度限制（Depth Limiting）**     | ⛔ 无法实现 | 不支持   | 未找到相关支持，需要通过 GraphQL Server 的中间件或插件实现                                                        |

### 详细分析

#### 4.1 指令支持（Directives）

**状态：✅ 内置支持**

**证据：**
- `gqtx/src/types.ts`（第 219 行）的 `Schema` 类型支持 `directives?: graphql.GraphQLDirective[]`
- `gqtx/src/build.ts`（第 43 行）在构建 Schema 时传递 `directives: schema.directives`
- `gqtx/CHANGELOG.md`（第 49, 54 行）记录支持传递 directives

**代码示例**：
```typescript
import { GraphQLDirective, DirectiveLocation } from 'graphql'

// 手动创建 GraphQLDirective 实例
const deprecatedDirective = new GraphQLDirective({
  name: 'deprecated',
  description: 'Marks an element as deprecated',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    reason: {
      type: graphql.GraphQLString,
      defaultValue: 'No longer supported',
    },
  },
})

// 传递给 buildGraphQLSchema
const schema = buildGraphQLSchema({
  query: Query,
  mutation: Mutation,
  directives: [deprecatedDirective],  // ✅ 支持传递 directives
})
```

**分析：**
- ✅ 原生支持 Directives 定义和使用
- ✅ 支持联邦架构 (Federation) Directives（通过手动创建 `GraphQLDirective` 实例）
- ⚠️ 需要手动创建 `GraphQLDirective` 实例，无声明式 API
- ✅ API 类型安全，完全兼容 `graphql-js`

#### 4.2 扩展支持（Extensions）

**状态：✅ 内置支持**

**证据：**
- `gqtx/src/define.ts`（第 25-32 行）定义了 `ExtensionsMap` 类型
- `gqtx/src/build.ts`（第 203, 209 行）在构建时传递 `extensions` 字段
- `gqtx/src/types.ts`（第 119, 143 行）Field 和 ObjectType 支持 `extensions?: Record<string, any>`

**代码示例**：
```typescript
// Field 扩展
Gql.Field({
  name: 'user',
  type: UserType,
  extensions: {
    complexity: 10,  // ✅ 支持扩展信息
    rateLimit: { max: 100, window: '1m' },
  },
  resolve: (_, { id }) => { /* ... */ },
})

// ObjectType 扩展
const UserType = Gql.Object<User>({
  name: 'User',
  extensions: {
    cacheControl: { maxAge: 3600 },
  },
  fields: () => [/* ... */],
})
```

**分析：**
- ✅ 原生支持 GraphQL Extensions 的定义和使用
- ✅ 能够声明查询复杂度（complexity）、执行时间等扩展信息
- ✅ API 直观，支持在 Field 和 ObjectType 上定义扩展
- ⚠️ 需要配合 GraphQL Server 的中间件或插件使用（如 `graphql-query-complexity`）

#### 4.3 批量加载（DataLoader）集成

**状态：⛔ 无法实现**

**证据：**
- 已在 Phase 4 详细评估，框架不提供任何 DataLoader 相关的 API 或工具
- 需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入

**分析：**
- ❌ 无内置支持：框架不提供任何 DataLoader 相关的 API
- ❌ 需要大量样板代码：需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入
- ❌ 无自动批处理：需要手动实现批处理逻辑
- ❌ 无缓存控制：需要手动实现缓存逻辑

#### 4.4 自定义标量（Scalars）

**状态：✅ 内置支持**

**证据：**
- `gqtx/src/define.ts`（第 79-102 行）通过 `Gql.Scalar()` 定义自定义标量
- `typescript-graphql-schemas/gqtx/src/schema.ts`（第 57-62 行）展示 DateTime 标量的定义
- `gqtx/src/build.ts`（第 151-162 行）在构建时处理自定义标量

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts:57-62`）：
```typescript
import { GraphQLDateTime } from 'graphql-scalars'

const DateTime = Gql.Scalar({
  name: 'DateTime',
  serialize: GraphQLDateTime.serialize,
  parseValue: GraphQLDateTime.parseValue,
  parseLiteral: GraphQLDateTime.parseLiteral,
})
```

**分析：**
- ✅ 定义新标量类型简便，API 直观
- ✅ 类型安全，支持泛型参数指定输入输出类型
- ✅ 可以集成 `graphql-scalars` 等库
- ⚠️ 不内置常用标量（如 DateTime、JSON、BigInt），需要手动定义或使用第三方库

#### 4.5 订阅（Subscription）

**状态：✅ 内置支持**

**证据：**
- `gqtx/src/define.ts`（第 377-424 行）提供 `Gql.Subscription()` 和 `Gql.SubscriptionField()` API
- `gqtx/test/simple.spec.ts`（第 604-668 行）展示完整的 Subscription 测试用例
- `gqtx/src/build.ts`（第 31-33, 66-90 行）在构建时处理 Subscription

**代码示例**（`gqtx/test/simple.spec.ts:604-628`）：
```typescript
const GraphQLSubscriptionObject = Gql.Subscription({
  name: 'Subscription',
  fields: () => [
    Gql.SubscriptionField({
      name: 'greetings',
      type: Gql.NonNull(Gql.String),
      subscribe: async function* () {
        for (const greeting of ['hi', 'ola', 'sup', 'hello']) {
          yield greeting
        }
      },
    }),
  ],
})

const schema = buildGraphQLSchema({
  query: Query,
  subscription: GraphQLSubscriptionObject,  // ✅ 支持 Subscription
})
```

**分析：**
- ✅ 原生支持 GraphQL Subscriptions
- ✅ 支持实时数据推送，通过 async generator 实现
- ✅ 底层传输协议兼容性好（通过 graphql-js 支持 WebSocket、SSE 等）
- ✅ API 简洁，类型安全

#### 4.6 上下文（Context）注入

**状态：✅ 内置支持**

**证据：**
- `gqtx/src/types.ts`（第 6 行）定义了 `GqlContext` 接口
- `gqtx/examples/starwars.ts`（第 12-16 行）展示通过模块扩展定义 Context
- `gqtx/src/define.ts`（第 158-185 行）Field 的 resolve 函数自动接收 Context 参数

**代码示例**（`gqtx/examples/starwars.ts:12-16`）：
```typescript
// 通过模块扩展定义 Context
declare module '../src/types.js' {
  interface GqlContext {
    contextContent: string
  }
}

// 在 Resolver 中使用
Gql.Field({
  name: 'contextContent',
  type: Gql.String,
  resolve: (_, _args, ctx) => ctx.contextContent,  // ✅ Context 自动注入
})
```

**分析：**
- ✅ 原生支持在 Resolver 中注入上下文
- ✅ 上下文的类型推导完善，通过模块扩展实现全局类型
- ✅ IDE 提示良好，无需手动类型声明
- ✅ 类型安全，所有 Resolver 的 Context 类型自动统一

#### 4.7 中间件（Middleware）

**状态：⛔ 无法实现**

**证据：**
- 未找到相关支持，无法在 Resolver 执行前后注入中间件逻辑
- 框架不提供中间件 API

**分析：**
- ❌ 完全不支持中间件机制
- ❌ 无法在 Resolver 执行前后注入逻辑（如日志记录、权限检查、性能监控）
- ⚠️ 可以通过手动包装 Resolver 函数实现类似功能，但需要大量样板代码

#### 4.8 查询复杂度分析（Query Complexity）

**状态：⛔ 无法实现**

**证据：**
- 未找到相关支持，无法防止复杂查询攻击
- 虽然可以通过 Extensions 声明复杂度，但需要配合外部库使用

**分析：**
- ❌ 不内置支持查询复杂度计算和分析
- ⚠️ 可以通过 Extensions 声明复杂度，但需要配合 `graphql-query-complexity` 等库使用
- ❌ 无法自动或声明式地计算查询复杂度

#### 4.9 深度限制（Depth Limiting）

**状态：⛔ 无法实现**

**证据：**
- 未找到相关支持，无法防止深度查询攻击
- 需要通过 GraphQL Server 的中间件或插件实现

**分析：**
- ❌ 完全不支持深度限制
- ⚠️ 需要通过 GraphQL Server 的中间件或插件实现（如 `graphql-depth-limit`）
- ❌ 无法自动限制查询嵌套深度

### 4.10 内置功能总结

| 功能                               | 支持状态   | 说明                                                   |
| :--------------------------------- | :--------- | :----------------------------------------------------- |
| **指令（Directives）**             | ✅ 内置支持 | 原生支持，但需要手动创建 `GraphQLDirective` 实例       |
| **扩展（Extensions）**             | ✅ 内置支持 | 原生支持，可在 Field 和 ObjectType 上定义扩展信息      |
| **批量加载（DataLoader）**         | ⛔ 无法实现 | 无内置支持，需要手动实现                               |
| **自定义标量（Scalars）**          | ✅ 内置支持 | 原生支持，API 直观且类型安全                           |
| **订阅（Subscription）**           | ✅ 内置支持 | 原生支持，通过 async generator 实现实时数据推送        |
| **上下文（Context）**              | ✅ 内置支持 | 原生支持，通过模块扩展实现全局类型，类型推导完善       |
| **中间件（Middleware）**           | ⛔ 无法实现 | 无内置支持，无法在 Resolver 执行前后注入逻辑           |
| **查询复杂度（Query Complexity）** | ⛔ 无法实现 | 无内置支持，需要通过外部库实现                         |
| **深度限制（Depth Limiting）**     | ⛔ 无法实现 | 无内置支持，需要通过 GraphQL Server 的中间件或插件实现 |

**综合评估：**
- ✅ **核心功能完善**：Context、Subscriptions、Custom Scalars、Directives、Extensions 都有原生支持
- ❌ **高级功能缺失**：DataLoader、Middleware、Query Complexity、Depth Limiting 无内置支持
- ⚠️ **需要外部库配合**：部分功能（如查询复杂度、深度限制）需要通过外部库或 GraphQL Server 中间件实现

## 5. 生态集成 (Ecosystem Integration)

### 核心集成策略

`gqtx` 采用 **标准 GraphQL Schema 输出 + 手动集成** 的策略。通过 `buildGraphQLSchema()` 输出标准 `GraphQLSchema`，可以与任何 GraphQL Server 集成，但需要手动适配。主要展示与 `express-graphql` 和 `graphql-yoga` 的集成，其他 Server 和框架需要通过标准 GraphQL Server 集成。

### 评分详情

#### 5.1 ORM 集成深度（ORM Integration Depth）

**得分：<-待评分-> - 弱集成**

**证据：**
- **无官方插件**：未找到 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- **需要手动集成**：`typescript-graphql-schemas/gqtx/src/schema.ts` 中所有数据库操作都是手动实现（使用内存 Map）
- **类型同步需手动维护**：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 需要手动定义 TypeScript 类型
type User = {
  id: number
  name: string
  email: string
}

// 需要手动定义 GraphQL 类型
const UserType = Gql.Object<User>({
  name: 'User',
  fields: () => [
    Gql.Field({ name: 'id', type: Gql.NonNull(Gql.Int) }),
    Gql.Field({ name: 'name', type: Gql.NonNull(Gql.String) }),
    Gql.Field({ name: 'email', type: Gql.NonNull(Gql.String) }),
  ],
})

// 需要手动实现数据库查询
const query = Gql.Query({
  fields: () => [
    Gql.Field({
      name: 'users',
      type: Gql.NonNull(Gql.List(Gql.NonNull(UserType))),
      resolve: () => Array.from(userMap.values()),  // 手动查询
    }),
    Gql.Field({
      name: 'user',
      type: UserType,
      args: {
        id: Gql.Arg({ type: Gql.NonNullInput(Gql.Int) }),
      },
      resolve: (_, { id }) => userMap.get(id),  // 手动查询
    }),
  ],
})
```

**分析：**
- ❌ **无官方插件**：不提供 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- ❌ **需要大量胶水代码**：必须手动编写所有数据库查询逻辑
- ❌ **类型同步需手动维护**：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步
- ⚠️ **可以手动集成**：虽然可以手动集成 ORM，但需要大量样板代码，且类型同步需要手动维护

#### 5.2 验证库集成（Validation Library Integration）

**得分：<-待评分-> - 弱集成**

**证据：**
- **无官方插件**：未找到 Zod、Yup、Valibot 等验证库的官方插件
- **需要手动集成**：所有验证逻辑都需要在 Resolver 中手动编写（`schema.ts:259, 400-404`）
- **验证逻辑与 Schema 定义分离**：验证代码分散在各个 Resolver 中，难以复用

**代码示例**（`typescript-graphql-schemas/gqtx/src/schema.ts`）：
```typescript
// 方式 1：在 Resolver 中手动验证
Gql.Field({
  name: 'createUser',
  type: Gql.NonNull(UserType),
  args: {
    name: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
    email: Gql.Arg({ type: Gql.NonNullInput(Gql.String) }),
  },
  resolve: (_, { name, email }) => {
    // ⚠️ 验证逻辑需要手动编写
    if (!email.includes('@')) throw new GraphQLError('Invalid email format')
    // ...
  },
})

// 方式 2：通过 Scalar 实现验证（需要手动创建 Scalar）
const EmailScalar = Gql.Scalar({
  name: 'Email',
  serialize: (value) => value,
  parseValue: (value) => {
    // ⚠️ 需要手动调用验证库
    if (!z.string().email().safeParse(value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return value
  },
  parseLiteral: (ast) => {
    // ⚠️ 需要手动调用验证库
    if (ast.kind !== 'StringValue') throw new GraphQLError('Invalid email')
    if (!z.string().email().safeParse(ast.value).success) {
      throw new GraphQLError('Invalid email format')
    }
    return ast.value
  },
})
```

**分析：**
- ❌ **无官方插件**：不提供 Zod、Yup、Valibot 等验证库的官方插件
- ❌ **验证逻辑重复**：需要在每个需要验证的地方手动编写验证代码
- ❌ **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用
- ⚠️ **可以通过 Scalar 实现**：理论上可以通过自定义 Scalar 的 `parseValue` 实现验证，但需要为每个验证场景创建独立的 Scalar 类型，增加了代码量
- ❌ **验证逻辑与 Schema 定义分离**：验证规则与 Schema 定义分离，需要手动维护同步

#### 5.3 GraphQL Server 兼容性（Server Compatibility）

**得分：<-待评分-> - 标准兼容**

**证据：**
- **完全兼容标准 GraphQL.js**：`gqtx/src/build.ts`（第 16-44 行）返回标准 `graphql.GraphQLSchema`
- **官方示例展示集成**：`gqtx/examples/starwars.ts`（第 365-378 行）展示与 `express-graphql` 的集成
- **实际业务集成**：`typescript-graphql-schemas/gqtx/src/server.ts` 展示与 `graphql-yoga` 的集成

**代码示例**：
```typescript
// 方式 1：与 express-graphql 集成（gqtx/examples/starwars.ts:365-378）
import express from 'express'
import graphqlHTTP from 'express-graphql'

const app = express()
app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildGraphQLSchema(schema),  // ✅ 标准 GraphQLSchema
    graphiql: true,
  })
)

// 方式 2：与 graphql-yoga 集成（typescript-graphql-schemas/gqtx/src/server.ts）
import { createYoga } from 'graphql-yoga'

const yoga = createYoga({ schema })  // ✅ 标准 GraphQLSchema
const server = createServer(yoga)
server.listen(4000)
```

**分析：**
- ✅ **与标准 GraphQL.js 兼容**：输出标准 `GraphQLSchema`，可以集成到任何 GraphQL Server
- ✅ **不绑定特定 Server**：可以与 Apollo Server、GraphQL Yoga、express-graphql、Envelop、Hono 等集成
- ⚠️ **需要手动适配**：虽然兼容，但需要手动适配，没有提供官方适配器
- ⚠️ **文档主要展示 express-graphql**：其他 Server 的集成文档不完整，需要参考官方示例

#### 5.4 工具链集成（Toolchain Integration）

**得分：<-待评分->**

**TypeScript/JavaScript 支持：**
- **源码完全使用 TypeScript**：`gqtx/src/` 目录下所有文件均为 `.ts` 文件（`index.ts`、`build.ts`、`define.ts`、`types.ts`、`relay.ts`）
- **构建输出支持 ESM 和 CommonJS**：`gqtx/package.json`（第 5-7 行）同时提供 `main: "cjs/index.cjs"` 和 `module: "index.js"`，`exports` 字段（第 8-30 行）同时支持 `import` 和 `require`
- **使用标准 TypeScript 语法**：`gqtx/tsconfig.json`（第 1-19 行）显示使用 TypeScript 5.1.6，目标 ES2019，无特殊编译器特性（如 decorators、reflect-metadata）
- **JavaScript 使用未明确说明**：文档和示例均为 TypeScript，未明确说明是否可以直接使用 JavaScript

**运行时环境支持：**
- **Node.js**：✅ **明确支持**。官方示例 `gqtx/examples/starwars.ts`（第 365-378 行）展示与 Express 的集成；`gqtx/package.json`（第 45 行）包含 `@types/node` 作为开发依赖
- **Bun**：⚠️ **理论上支持但未验证**。源码无 Node.js 特定 API（`gqtx/src/` 目录下无 `fs`、`path`、`http`、`process` 等导入），仅依赖 `graphql` 包，但无 Bun 相关文档或示例
- **Deno**：⚠️ **理论上支持但未验证**。源码无 Node.js 特定 API，但无 Deno 相关文档、示例或配置
- **Cloudflare Workers**：⚠️ **理论上支持但未验证**。源码无 Node.js 特定 API，但无 Cloudflare Workers 相关文档、示例或配置
- **浏览器**：⚠️ **理论上支持但未验证**。源码无 Node.js 特定 API，但无浏览器运行示例或文档；`gqtx/README.md` 明确说明是 "GraphQL server" 库，主要面向服务器端

**构建工具支持：**
- **框架自身使用 Rollup**：`gqtx/rollup.config.js`（第 25-39 行）使用 Rollup 和 `@rollup/plugin-typescript` 构建，输出 ESM 和 CommonJS 两种格式
- **用户项目构建工具**：⚠️ **无官方配置示例**。文档和示例中未提供 webpack、vite、rspack 等构建工具的配置示例；用户项目可以使用任何构建工具，但需要自行配置
- **TypeScript 配置**：`gqtx/tsconfig.json`（第 1-19 行）显示使用 `target: "ES2019"`、`module: "ESNext"`、`moduleResolution: "NodeNext"`，用户项目需要根据目标环境调整配置

**代码证据：**
```typescript
// gqtx/src/index.ts - 源码仅依赖 graphql，无 Node.js 特定 API
export * from './types.js';
export * from './define.js';
export {
  buildGraphQLSchema,
  toGraphQLInputType,
  toGraphQLOutputType,
} from './build.js';

// gqtx/package.json - 同时支持 ESM 和 CommonJS
{
  "type": "module",
  "main": "cjs/index.cjs",
  "module": "index.js",
  "exports": {
    ".": {
      "import": { "default": "./index.js" },
      "require": { "default": "./cjs/index.cjs" }
    }
  }
}

// gqtx/examples/starwars.ts - 仅展示 Node.js + Express 示例
import express = require('express');
import graphqlHTTP = require('express-graphql');
const app = express();
app.use('/graphql', graphqlHTTP({ schema: buildGraphQLSchema(schema) }));
app.listen(5000);
```

**分析：**
- ✅ **TypeScript 原生支持**：框架完全用 TypeScript 编写，编译为 JavaScript，支持 ESM 和 CommonJS
- ✅ **Node.js 明确支持**：官方示例和文档明确展示 Node.js 环境使用
- ✅ **源码无运行时绑定**：源码仅依赖 `graphql` 包，无 Node.js 特定 API，理论上可在任何 JavaScript 环境运行
- ⚠️ **其他运行时未验证**：Bun、Deno、Cloudflare Workers、浏览器等环境无文档、示例或配置，需要用户自行验证和适配
- ⚠️ **构建工具集成缺失**：无 webpack、vite、rspack 等构建工具的官方配置示例，用户需要自行配置
- ⚠️ **主要面向服务器端**：文档和示例均为服务器端使用场景，无浏览器或边缘环境的使用指南

### 5.5 生态集成总结

| 评估项                    | 得分       | 说明                                                                      |
| :------------------------ | :--------- | :------------------------------------------------------------------------ |
| **ORM 集成深度**          | <-待评分-> | 弱集成，无官方插件，需要大量胶水代码，类型同步需手动维护                  |
| **验证库集成**            | <-待评分-> | 弱集成，无官方插件，验证逻辑与 Schema 定义分离，需要大量样板代码          |
| **GraphQL Server 兼容性** | <-待评分-> | 标准兼容，与标准 GraphQL.js 完全兼容，可以集成到任何 GraphQL Server       |
| **工具链集成**            | <-待评分-> | TypeScript 原生支持，Node.js 明确支持，其他运行时未验证，构建工具集成缺失 |

**综合得分：2.5**

**优势：**
- GraphQL Server 兼容性极佳：与标准 GraphQL.js 完全兼容，可以集成到任何 GraphQL Server
- TypeScript 原生支持：框架完全用 TypeScript 编写，编译为 JavaScript，支持 ESM 和 CommonJS
- 源码无运行时绑定：源码仅依赖 `graphql` 包，无 Node.js 特定 API，理论上可在任何 JavaScript 环境运行
- 完全中立：不绑定特定 Server 或框架，灵活性强

**劣势：**
- ORM 集成缺失：无官方插件，需要大量胶水代码，类型同步需手动维护
- 验证库集成缺失：无官方插件，验证逻辑与 Schema 定义分离，需要大量样板代码
- 其他运行时未验证：Bun、Deno、Cloudflare Workers、浏览器等环境无文档、示例或配置
- 构建工具集成缺失：无 webpack、vite、rspack 等构建工具的官方配置示例
- 集成文档有限：主要提供 express-graphql 的示例，其他环境需要自行适配

## 📝 总结

### 综合评分：2.3/5.0

| 维度         | 得分 | 说明                                              |
| ------------ | ---- | ------------------------------------------------- |
| 架构模式     | 5.0  | 极简依赖、纯运行时构建、零魔法、完全中立          |
| 类型定义     | 1.5  | 逻辑关联、显式注册、需要手动维护同步              |
| 解析器与验证 | 1.8  | 参数类型可推断，但无模块化、无验证、无 DataLoader |
| 内置功能     | 2.8  | 核心功能完善，但高级功能缺失                      |
| 生态集成     | 2.5  | GraphQL Server 兼容性佳，但 ORM 和验证库集成缺失  |

### 整体评价

gqtx 采用 Builder（构建器）模式，实现了极简依赖、零魔法的设计理念。仅依赖 `graphql` 标准库，完全运行时构建，无需代码生成，完全符合原生 TypeScript 最佳实践。但在类型定义、模块化、验证和 DataLoader 方面支持有限，需要大量手动工作。

### 核心优势

1. **极简依赖**：仅依赖 `graphql` 标准库，零运行时开销
2. **零魔法**：完全符合原生 TypeScript 最佳实践，不使用装饰器、反射元数据
3. **即写即用**：纯运行时构建，无需代码生成，支持热重载
4. **参数类型自动推断**：Resolver 的参数类型可以自动推断，IDE 提示完善
5. **完全中立**：不绑定任何框架，可与所有 GraphQL Server 集成

### 主要劣势

1. **类型定义需手动维护**：TypeScript 类型与 GraphQL 类型分离定义，需要手动维护同步
2. **无模块化支持**：完全按操作类型组织，无强制模块边界，容易写出耦合代码
3. **无内置验证**：所有验证逻辑都需要手动编写，验证代码重复
4. **无 DataLoader 支持**：需要手动实现，需要大量样板代码
5. **接口字段需重复声明**：实现接口时必须手动重复声明所有公共字段

### 适用场景

#### 推荐使用

- 小型项目，需要极简依赖和零魔法
- 对类型同步要求不高的项目
- 不需要模块化、验证或 DataLoader 的项目

#### 不推荐使用

- 中大型项目，需要模块化和类型同步
- 需要验证或 DataLoader 的项目
- 需要接口字段自动继承的项目

### 改进建议

1. **提供类型自动同步机制**：从 TypeScript 类型自动生成 GraphQL 类型，减少手动维护
2. **增强模块化支持**：提供按领域组织的 API，强制模块边界
3. **提供验证和 DataLoader 支持**：减少样板代码，提高开发效率
4. **支持接口字段自动继承**：减少重复声明
