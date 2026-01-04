# Grats 评估报告 (2026)

> 本报告基于实际业务代码 (`typescript-graphql-schemas/grats/src`) 及官方示例 (`@grats/examples`) 生成。

## 📋 基本信息
| 项目         | 内容                                  |
| :----------- | :------------------------------------ |
| **当前版本** | 0.0.34                                |
| **GitHub**   | https://github.com/captbaritone/grats |
| **文档站**   | https://grats.capt.dev                |
| **初次提交** | 2023-03-05                            |
| **最近提交** | 2025-12-21                            |

## 📊 综合评分
| 维度                | 得分 (1-5) | 简评                                                               |
| :------------------ | :--------- | :----------------------------------------------------------------- |
| **1. 架构模式**     | **3.5**    | 轻量依赖，使用标准 JSDoc 注释，但需要构建步骤，配置略显复杂        |
| **2. 类型定义**     | **4.5**    | 完全支持原生 TypeScript 语法，强大的类型推断，接口字段自动继承     |
| **3. 解析器与验证** | **2.8**    | 函数式 API 简洁，参数类型自动推断，但无内置验证和 DataLoader       |
| **4. 内置功能**     | <-待评分-> | 核心功能完善（Directives、Scalars、Subscriptions），但高级功能缺失 |
| **5. 生态集成**     | <-待评分-> | GraphQL Server 兼容性极佳，但 ORM 和验证库需要手动集成             |

---

## 1. 架构模式 (Architecture)

Grats 采用 **静态分析（Static Analysis）** 架构模式，通过 TypeScript 编译器 API 分析源码中的 JSDoc 注释和类型定义，在编译时生成 GraphQL Schema。这是一种 **Implementation-First** 的方法，将 TypeScript 代码作为单一数据源。

### 架构概述

**核心机制**：
- **静态分析**：使用 TypeScript 编译器 API（`ts.Program`）分析源码（`src/Extractor.ts`）
- **JSDoc 驱动**：通过 JSDoc 注释（`@gqlType`, `@gqlField` 等）标记 GraphQL 实体
- **代码生成**：CLI 工具生成可执行的 TypeScript Schema 文件和 GraphQL SDL 文件
- **编译器插件**：提供可选的 TypeScript 语言服务插件，用于 IDE 实时诊断

**工作流程**（`src/lib.ts:90-146`）：
1. 使用 TypeScript 编译器 API 创建 `Program`
2. 提取所有带 JSDoc 标记的定义（`extractSnapshotsFromProgram`）
3. 解析类型引用、验证接口合并、处理默认可空性
4. 生成 GraphQL AST（`DocumentNode`）
5. 验证 Schema 并生成可执行代码（`src/codegen/schemaCodegen.ts`）

### 1.1 依赖复杂度 (Dependency Complexity)

**评分：4.0**

**证据**：
- **运行时依赖**（`grats/package.json` 第 20-24 行）：
  - `commander: ^14.0.1` - CLI 命令行工具
  - `graphql: ^16.11.0` - GraphQL 标准库
  - `semver: ^7.7.2` - 版本比较工具
  - `typescript: 5.9.2` - TypeScript 编译器（固定版本）
- **无装饰器依赖**：不需要 `reflect-metadata` 或装饰器支持
- **无反射库**：不依赖运行时反射机制
- **编译器插件**（`grats-ts-plugin/package.json`）：独立的可选包，用于 IDE 支持

**分析**：
- ✅ 仅 4 个运行时依赖，相比装饰器模式（需要 `reflect-metadata`、`class-validator` 等）更轻量
- ✅ 核心依赖仅为 `graphql` 和 `typescript`，符合最小依赖原则
- ⚠️ `typescript` 作为运行时依赖（而非 `devDependency`），因为需要编译器 API 进行静态分析
- ✅ 编译器插件（`grats-ts-plugin`）为可选依赖，不影响核心功能

**实际使用**（`typescript-graphql-schemas/grats/package.json`）：
- 业务代码仅需安装 `grats` 作为 `devDependency`
- 运行时仅依赖 `graphql` 和生成的 Schema 文件

### 1.2 构建流程 (Build Flow)

**评分：3.0**

**证据**：
- **必须运行 CLI**：必须执行 `npx grats` 或 `grats` 命令生成 Schema（`src/cli.ts:47-53`）
- **生成两个文件**：
  - `.graphql` 文件：GraphQL SDL 定义（`src/cli.ts:187-191`）
  - `.ts` 文件：可执行的 TypeScript Schema（`src/cli.ts:182-185`）
- **支持 Watch 模式**：`--watch` 选项支持文件变更时自动重新生成（`src/cli.ts:48-49`）
- **构建过程透明**：使用 TypeScript 编译器 API，构建逻辑可追踪（`src/lib.ts:72-77`）

**实际使用示例**（`typescript-graphql-schemas/grats/package.json` 第 7-8 行）：
```json
{
  "scripts": {
    "print": "grats && node src/print.ts",
    "test": "grats && node src/schema.test.ts"
  }
}
```

**生成的 Schema 文件**（`typescript-graphql-schemas/grats/src/schema.ts`）：
- 包含完整的 `GraphQLSchema` 实例生成代码
- 自动导入所有 Resolver 函数
- 类型安全的 Schema 配置接口（`SchemaConfig`）

**构建流程细节**（`src/cli.ts:173-211`）：
1. 读取 `tsconfig.json` 并解析 Grats 配置（`getTsConfig`）
2. 使用 TypeScript 编译器 API 分析源码（`extractSchemaAndDoc`）
3. 生成 TypeScript Schema 代码（`printExecutableSchema`）
4. 生成 GraphQL SDL（`printGratsSDL`）
5. 可选：生成枚举模块（`printEnumsModule`）

**分析**：
- ⚠️ 必须运行构建命令，无法"即写即用"
- ✅ 支持 Watch 模式，开发体验良好
- ✅ 生成的代码可读性强，便于调试
- ⚠️ 需要将构建步骤集成到开发流程中（如 `package.json` scripts）

### 1.3 配置魔法 (Config & Language Magic)

**评分：4.0**

**证据**：
- **JSDoc 注释驱动**：使用标准 JSDoc 注释标记 GraphQL 实体（`src/Extractor.ts:60-73`）：
  - `@gqlType` - 对象类型
  - `@gqlField` - 字段
  - `@gqlQueryField` - Query 字段
  - `@gqlMutationField` - Mutation 字段
  - `@gqlEnum` - 枚举类型
  - `@gqlUnion` - 联合类型
  - `@gqlInterface` - 接口类型
- **TypeScript 编译器插件**（可选）：提供 IDE 实时诊断（`src/tsPlugin/initTsPlugin.ts`）
- **配置在 tsconfig.json**：Grats 配置位于 `tsconfig.json` 的 `grats` 字段（`src/gratsConfig.ts:33`）

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}

/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())
}
```

**配置示例**（`typescript-graphql-schemas/grats/tsconfig.json`）：
```json
{
  "grats": {
    "importModuleSpecifierEnding": ".ts",
    "tsSchema": "./src/schema.ts"
  },
  "compilerOptions": {
    "module": "nodenext",
    "target": "esnext",
    "strict": true
  }
}
```

**编译器插件配置**（`examples/apollo-server/tsconfig.json`）：
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "grats-ts-plugin"
      }
    ]
  }
}
```

**分析**：
- ✅ 使用标准 JSDoc 注释，符合 TypeScript 最佳实践
- ✅ 不依赖装饰器或反射元数据，无需特殊编译选项
- ⚠️ 需要大量 JSDoc 注释，代码略显冗长
- ✅ 编译器插件为可选，但提供更好的开发体验
- ⚠️ 配置需要在 `tsconfig.json` 中声明，增加了配置复杂度

### 1.4 生态集成 (Ecosystem Integration)

**评分：4.0**

**证据**：
- **标准 npm 安装**：通过 `npm install grats` 或 `pnpm add grats` 安装（`grats/package.json`）
- **TypeScript 编译器插件**：提供 `grats-ts-plugin` 包，支持 IDE 实时诊断（`grats-ts-plugin/package.json`）
- **多种 GraphQL Server 支持**：官方示例包含（`grats/examples/`）：
  - Apollo Server（`examples/apollo-server/`）
  - GraphQL Yoga（`examples/yoga/`）
  - Express GraphQL HTTP（`examples/express-graphql-http/`）
  - Next.js（`examples/next-js/`）
- **标准 GraphQL Schema**：生成的 Schema 为标准 `GraphQLSchema` 实例，兼容所有 GraphQL Server

**实际集成示例**（`typescript-graphql-schemas/grats/src/server.ts`）：
```typescript
import { getSchema } from './schema.ts'
import { createYoga } from 'graphql-yoga'

const schema = getSchema({
  scalars: {
    DateTime: {
      // 自定义标量配置
    }
  }
})

const yoga = createYoga({ schema })
```

**Apollo Server 集成**（`examples/apollo-server/server.ts`）：
```typescript
import { getSchema } from './schema'

const server = new ApolloServer({
  schema: getSchema(),
})
```

**Next.js 集成**（`examples/next-js/app/api/graphql/route.ts`）：
- 支持 Next.js App Router
- 使用标准 GraphQL HTTP 端点

**分析**：
- ✅ 标准 npm 包，安装简单
- ✅ 生成的 Schema 为标准 GraphQL.js 实例，兼容性极佳
- ✅ 提供多种 Server 集成示例，覆盖主流场景
- ✅ 编译器插件增强 IDE 体验，但为可选
- ⚠️ 需要手动配置 `tsconfig.json` 中的 `grats` 字段

### 评分详情

#### 1.1 依赖复杂度 (Dependency Complexity)

**得分：4.0**

**理由**：
- 运行时依赖仅 4 个（`commander`, `graphql`, `semver`, `typescript`）
- 无装饰器、无反射元数据依赖
- 编译器插件为可选依赖
- 相比装饰器模式（需要 `reflect-metadata`、`class-validator` 等）更轻量

#### 1.2 构建流程 (Build Flow)

**得分：3.0**

**理由**：
- 必须运行 CLI 命令生成 Schema，无法"即写即用"
- 支持 Watch 模式，开发体验良好
- 生成代码可读性强，便于调试
- 需要将构建步骤集成到开发流程中

#### 1.3 配置魔法 (Config & Language Magic)

**得分：4.0**

**理由**：
- 使用标准 JSDoc 注释，符合 TypeScript 最佳实践
- 不依赖装饰器或反射元数据
- 需要大量 JSDoc 注释，代码略显冗长
- 配置需要在 `tsconfig.json` 中声明

#### 1.4 生态集成 (Ecosystem Integration)

**得分：4.0**

**理由**：
- 标准 npm 安装，流程简单
- 生成的 Schema 为标准 GraphQL.js 实例，兼容性极佳
- 提供多种 Server 集成示例
- 编译器插件增强 IDE 体验（可选）

### 综合评分

**架构模式总分：3.5**

**优势**：
- 轻量依赖，无运行时开销
- 使用标准 JSDoc 注释，符合 TypeScript 最佳实践
- 生成的代码可读性强，便于调试
- 兼容所有标准 GraphQL Server

**劣势**：
- 必须运行构建命令，无法"即写即用"
- 需要大量 JSDoc 注释，代码略显冗长
- 配置需要在 `tsconfig.json` 中声明，增加配置复杂度

## 2. 类型定义 (Type Definition)

Grats 采用 **Implementation-First** 方法，TypeScript 代码是单一数据源。通过静态分析 TypeScript 类型定义和 JSDoc 注释，自动生成 GraphQL Schema。类型推断基于 TypeScript 编译器 API，能够深度分析类型结构。

### 2.1 单一数据源（Single Source of Truth）实现度

**评分：4.5**

**证据**：
- **TypeScript 代码即 Schema**：`typescript-graphql-schemas/grats/src/models/user.ts` 中的 TypeScript 类型定义直接生成 GraphQL Schema
- **自动类型提取**：通过 TypeScript 编译器 API（`src/Extractor.ts`）分析源码，提取类型信息
- **双向同步**：TypeScript 类型和 GraphQL Schema 都从同一份代码生成，无需手动维护两套定义
- **需要构建步骤**：必须运行 `grats` CLI 命令才能生成 Schema（`src/cli.ts:182-191`）

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}
```

**生成的 GraphQL Schema**（`schema.graphql` 第 83-89 行）：
```graphql
"""User information"""
type User {
  email: String
  id: Int
  name: String
  orders: [Order!]
}
```

**生成的 TypeScript Schema**（`src/schema.ts` 第 140-166 行）：
- 自动生成可执行的 `GraphQLSchema` 实例
- 自动导入所有 Resolver 函数
- 类型安全的 Schema 配置接口

**分析**：
- ✅ TypeScript 代码是单一数据源，GraphQL Schema 自动从中提取
- ✅ 类型定义和 Schema 定义完全同步，无需手动维护
- ⚠️ 需要运行构建命令才能生成 Schema，无法"即写即用"
- ✅ 生成的代码可读性强，便于调试和验证

### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**评分：5.0**

**证据**：
- **支持 TypeScript Enum**：`src/Extractor.ts:2032-2082` 的 `enumEnumDeclaration` 方法支持 TypeScript `enum` 声明
- **支持字符串联合类型**：`src/Extractor.ts:2084-2117` 的 `enumTypeAliasDeclaration` 方法支持 `type Enum = 'A' | 'B'` 语法
- **零配置**：直接使用原生 TypeScript 语法，无需任何手动注册或映射

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/menu.ts` 第 6-10 行）：
```typescript
/**
 * Sugar level for coffee
 * @gqlEnum
 */
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
```

**生成的 GraphQL Schema**（`schema.graphql` 第 13-19 行）：
```graphql
"""Sugar level for coffee"""
enum SugarLevel {
  HIGH
  LOW
  MEDIUM
  NONE
}
```

**TypeScript Enum 支持**（`src/Extractor.ts:2032-2082`）：
- 支持标准的 TypeScript `enum` 声明
- 要求枚举成员使用字符串字面量初始化（`src/Extractor.ts:2186-2194`）
- 如果配置了 `tsClientEnums`，要求枚举必须导出（`src/Extractor.ts:2045-2052`）

**字符串联合类型支持**（`src/Extractor.ts:2119-2177`）：
- 支持 `type Enum = 'A' | 'B' | 'C'` 语法
- 自动提取所有字符串字面量作为枚举值
- 如果配置了 `tsClientEnums`，不支持类型别名枚举（`src/Extractor.ts:2094-2097`）

**分析**：
- ✅ 完全支持原生 TypeScript 枚举语法，零配置
- ✅ 支持两种方式：TypeScript Enum 和字符串联合类型
- ✅ 类型安全：枚举值在 TypeScript 和 GraphQL 中完全同步
- ✅ 无需手动映射或注册，直接使用即可

### 2.3 接口继承与联合类型体验（Interface & Union）

**评分：4.5**

**证据**：
- **接口字段自动继承**：`src/transforms/addInterfaceFields.ts` 自动将接口字段添加到实现类型
- **TypeScript `implements` 支持**：`typescript-graphql-schemas/grats/src/models/menu.ts` 使用 `implements Food` 语法
- **Union 类型支持**：`src/Extractor.ts:666-702` 的 `unionTypeAliasDeclaration` 支持 `type Union = A | B` 语法
- **需要手动 `__typename`**：Union 类型需要在类中手动定义 `__typename` 字段（`typescript-graphql-schemas/grats/src/models/menu.ts` 第 17、43 行）

**接口继承示例**（`typescript-graphql-schemas/grats/src/interfaces/Food.ts`）：
```typescript
/**
 * Food interface with common fields
 * @gqlInterface
 */
export interface Food {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
}
```

**实现接口**（`typescript-graphql-schemas/grats/src/models/menu.ts` 第 16-36 行）：
```typescript
/**
 * Coffee menu item
 * @gqlType
 */
export class Coffee implements Food {
  __typename = 'Coffee' as const
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  price: Float
  /** @gqlField */
  sugarLevel: SugarLevel
  /** @gqlField */
  origin: string
  // ... 接口字段自动继承，无需重复声明
}
```

**生成的 GraphQL Schema**（`schema.graphql` 第 31-38 行）：
```graphql
"""Coffee menu item"""
type Coffee implements Food {
  id: Int
  name: String
  origin: String
  price: Float
  sugarLevel: SugarLevel
}
```

**接口字段自动添加机制**（`src/transforms/addInterfaceFields.ts:24-53`）：
- 如果接口上定义了函数式字段（使用 `@gqlField`），会自动添加到所有实现类型
- 通过 `computeInterfaceMap` 计算接口实现关系（`src/InterfaceGraph.ts:11-59`）
- 在构建 Schema 时自动合并接口字段

**Union 类型示例**（`typescript-graphql-schemas/grats/src/models/menu.ts` 第 61-65 行）：
```typescript
/**
 * Menu item union type
 * @gqlUnion
 */
export type MenuItem = Coffee | Dessert
```

**生成的 GraphQL Schema**（`schema.graphql` 第 21-22 行）：
```graphql
"""Menu item union type"""
union MenuItem = Coffee | Dessert
```

**Union 类型决议**（`src/validations/validateTypenames.ts:22-68`）：
- 要求所有 Union 成员类型必须有 `__typename` 字段
- 通过 `hasTypename` Set 跟踪哪些类型有 `__typename` 字段
- 如果类型没有 `__typename` 字段，会报错（`src/validations/validateTypenames.ts:42-60`）

**分析**：
- ✅ 接口字段自动继承，实现类型无需重复声明公共字段
- ✅ 支持 TypeScript `implements` 语法，符合原生 TypeScript 实践
- ✅ 支持在接口上定义函数式字段，自动添加到所有实现类型
- ⚠️ Union 类型需要手动定义 `__typename` 字段，增加了一些样板代码
- ✅ Union 类型支持原生 TypeScript Union 语法，零配置

### 2.4 类型推断强度与显式声明平衡

**评分：4.0**

**证据**：
- **基础类型自动推断**：`src/Extractor.ts` 通过 TypeScript 编译器 API 自动推断 `string`、`number`、`boolean` 等基础类型
- **数组类型自动推断**：支持 `Type[]` 和 `Array<Type>` 语法，自动推断为 GraphQL List 类型
- **可选类型自动推断**：支持 `Type | null` 和 `Type?` 语法，自动推断可空性
- **需要显式类型别名**：对于 GraphQL 特定类型（如 `Int`、`Float`），需要使用 `grats` 包提供的类型别名（`typescript-graphql-schemas/grats/src/models/user.ts` 第 5 行）

**类型推断示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
import type { Int } from 'grats'

/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int              // 显式使用 Int 类型别名
  /** @gqlField */
  name: string         // 自动推断为 String
  /** @gqlField */
  email: string        // 自动推断为 String
}
```

**数组类型推断**（`typescript-graphql-schemas/grats/src/models/order.ts` 第 26 行）：
```typescript
/** @gqlField */
itemIds: Int[]        // 自动推断为 [Int!]
```

**可选类型推断**（`typescript-graphql-schemas/grats/src/models/menu.ts` 第 83 行）：
```typescript
/** @gqlQueryField */
export function menuItem(id: Int): MenuItem | null {
  // 返回类型自动推断为 MenuItem（可空）
}
```

**类型解析机制**（`src/transforms/resolveTypes.ts:41-47`）：
- 使用两阶段解析：先提取所有声明，再解析类型引用
- 支持泛型类型参数（`src/transforms/resolveTypes.ts:73-98`）
- 通过 `TypeContext` 跟踪类型声明和引用（`src/TypeContext.ts:62-298`）

**默认可空性处理**（`src/transforms/applyDefaultNullability.ts`）：
- 如果配置了 `nullableByDefault: true`，所有字段默认为可空
- 可以通过 `@killsParentOnException` 标记字段为非空
- 支持严格语义可空性（`strictSemanticNullability`）

**分析**：
- ✅ 强大的类型推断：自动推断基础类型、数组、可选类型
- ✅ 深度类型分析：通过 TypeScript 编译器 API 进行语义分析
- ⚠️ 需要显式类型别名：对于 GraphQL 特定类型（`Int`、`Float`），需要使用类型别名
- ✅ 支持复杂类型：泛型、联合类型、接口等都能正确推断
- ✅ 类型安全：所有类型推断都是类型安全的，编译时检查

### 评分详情

#### 2.1 单一数据源（Single Source of Truth）实现度

**得分：4.5**

**理由**：
- TypeScript 代码是单一数据源，GraphQL Schema 自动从中提取
- 类型定义和 Schema 定义完全同步，无需手动维护
- 需要运行构建命令才能生成 Schema，无法"即写即用"
- 生成的代码可读性强，便于调试和验证

#### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**得分：5.0**

**理由**：
- 完全支持原生 TypeScript 枚举语法，零配置
- 支持两种方式：TypeScript Enum 和字符串联合类型
- 类型安全：枚举值在 TypeScript 和 GraphQL 中完全同步
- 无需手动映射或注册，直接使用即可

#### 2.3 接口继承与联合类型体验（Interface & Union）

**得分：4.5**

**理由**：
- 接口字段自动继承，实现类型无需重复声明公共字段
- 支持 TypeScript `implements` 语法，符合原生 TypeScript 实践
- 支持在接口上定义函数式字段，自动添加到所有实现类型
- Union 类型需要手动定义 `__typename` 字段，增加了一些样板代码

#### 2.4 类型推断强度与显式声明平衡

**得分：4.0**

**理由**：
- 强大的类型推断：自动推断基础类型、数组、可选类型
- 深度类型分析：通过 TypeScript 编译器 API 进行语义分析
- 需要显式类型别名：对于 GraphQL 特定类型（`Int`、`Float`），需要使用类型别名
- 支持复杂类型：泛型、联合类型、接口等都能正确推断

### 综合评分

**类型定义总分：4.5**

**优势**：
- 完全支持原生 TypeScript 语法，零配置
- 强大的类型推断能力，自动分析复杂类型结构
- 接口字段自动继承，减少重复代码
- 类型定义和 Schema 定义完全同步

**劣势**：
- 需要运行构建命令才能生成 Schema
- Union 类型需要手动定义 `__typename` 字段
- 对于 GraphQL 特定类型需要使用类型别名

## 3. 解析器与验证 (Resolvers & Validation)

Grats 的 Resolver 定义采用 **函数式 API + JSDoc 注释** 的方式。所有 Resolver 都是普通的 TypeScript 函数，通过 JSDoc 注释标记为 GraphQL 字段。参数类型通过 TypeScript 类型系统自动推断，但需要显式声明参数。

### 核心实现机制

**源码证据**：
- Resolver 签名处理：`src/resolverSignature.ts` 定义了 Resolver 参数类型系统
- 参数解析：`src/transforms/resolveResolverParams.ts` 解析 Resolver 参数，区分 GraphQL 参数、Context、Info
- Context 注入：通过 `@gqlContext` 标记 Context 类型（`src/Extractor.ts:74`）

### 3.1 开发体验（代码简洁度）

**评分：4.0**

**证据**：
- **函数式 API**：`typescript-graphql-schemas/grats/src/models/user.ts` 中的 Resolver 都是普通函数
- **JSDoc 注释标记**：通过 `@gqlQueryField`、`@gqlMutationField`、`@gqlField` 标记
- **参数类型自动推断**：函数参数类型通过 TypeScript 自动推断
- **需要 JSDoc 注释**：每个 Resolver 都需要 JSDoc 注释，代码略显冗长

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())
}

/** @gqlQueryField */
export function user(id: Int): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  return user
}

/** @gqlField */
export function orders(user: User): Order[] {
  return getOrdersByUserId(user.id)
}

/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}
```

**代码量分析**：
- Query Resolver：每个函数约 3-5 行代码 + 1 行 JSDoc 注释
- Mutation Resolver：每个函数约 5-10 行代码 + 1 行 JSDoc 注释
- Field Resolver：每个函数约 2-4 行代码 + 1 行 JSDoc 注释

**分析**：
- ✅ 函数式 API 简洁直观，符合 TypeScript 最佳实践
- ✅ 参数类型自动推断，无需手动声明
- ⚠️ 需要 JSDoc 注释，每个 Resolver 都需要标记
- ✅ 代码结构清晰，易于理解和维护

### 3.2 模块化设计（领域驱动开发支持）

**评分：4.0**

**证据**：
- **按领域组织**：`typescript-graphql-schemas/grats/src/models/` 目录按领域模块组织（`user.ts`、`menu.ts`、`order.ts`）
- **类型定义与 Resolver 合一**：每个模块包含类型定义、Query、Mutation 和 Field Resolver
- **不强制模块化**：可以按领域拆分文件，也可以将所有 Resolver 放在一个文件中
- **无模块边界**：没有强制模块边界，需要开发者自觉遵守

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
// User 模块：包含类型定义、Query、Mutation、Field Resolver
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}

/** @gqlQueryField */
export function users(): User[] { ... }

/** @gqlQueryField */
export function user(id: Int): User { ... }

/** @gqlField */
export function orders(user: User): Order[] { ... }

/** @gqlMutationField */
export function createUser(name: string, email: string): User { ... }
```

**模块组织方式**：
- 每个模块文件包含：
  - 类型定义（`@gqlType`、`@gqlInterface`、`@gqlUnion`、`@gqlEnum`）
  - Query Resolver（`@gqlQueryField`）
  - Mutation Resolver（`@gqlMutationField`）
  - Field Resolver（`@gqlField`）

**分析**：
- ✅ 支持按领域模块组织代码，类型定义和 Resolver 在同一模块中
- ✅ 提供了模块化 API，可以按领域拆分文件
- ⚠️ 不强制模块化，可以写出耦合的巨型文件（但通过设计可以避免）
- ✅ 代码组织清晰，易于维护和测试

### 3.3 参数定义与类型推导

**评分：4.0**

**证据**：
- **参数类型自动推断**：`typescript-graphql-schemas/grats/src/models/user.ts` 第 28 行的 `user(id: Int)` 中，`id` 类型自动推断为 `Int`
- **参数解析机制**：`src/transforms/resolveResolverParams.ts:33-68` 自动解析 Resolver 参数，区分 GraphQL 参数、Context、Info
- **IDE 提示完善**：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- **需要显式声明参数**：函数参数需要显式声明类型（如 `id: Int`）

**参数类型系统**（`src/resolverSignature.ts:48-97`）：
- `SourceResolverArgument`：父对象（source）
- `ArgumentsObjectResolverArgument`：参数对象（`args: { id: Int }`）
- `ContextResolverArgument`：Context 参数（`ctx: Ctx`）
- `DerivedContextResolverArgument`：派生 Context（通过 `@gqlContext` 函数）
- `InformationResolverArgument`：Info 参数（`info: GraphQLResolveInfo`）
- `NamedResolverArgument`：命名参数（`id: Int`）

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/** @gqlQueryField */
export function user(id: Int): User {
  // id 类型自动推断为 Int，IDE 提示完善
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  return user
}

/** @gqlMutationField */
export function updateUser(
  id: Int,
  name?: string | null,
  email?: string | null
): User {
  // 所有参数类型自动推断，可选参数自动处理
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  if (name != null) user.name = name
  if (email != null) {
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    user.email = email
  }
  return user
}
```

**Context 注入示例**（`examples/production-app/ViewerContext.ts` 第 48-54 行）：
```typescript
/** @gqlContext */
export type Ctx = YogaInitialContext & { vc: VC; credits: number }

/** @gqlContext */
export function getVc(ctx: Ctx): VC {
  return ctx.vc
}

// 在 Resolver 中使用
/** @gqlQueryField */
export function currentUser(vc: VC): User {
  // vc 类型自动推断为 VC，通过派生 Context 注入
  return vc.getUserById(vc.userId())
}
```

**参数解析机制**（`src/transforms/resolveResolverParams.ts:123-294`）：
- 自动识别参数类型：通过 TypeScript 类型系统识别参数是 GraphQL 参数、Context 还是 Info
- 支持派生 Context：通过 `@gqlContext` 函数定义的派生 Context 自动注入
- 验证参数组合：确保参数组合有效（如不能同时使用位置参数和参数对象）

**分析**：
- ✅ 参数类型大部分自动推断：通过 TypeScript 类型系统自动推断参数类型
- ✅ IDE 提示完善：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- ⚠️ 需要显式声明参数：函数参数需要显式声明类型（虽然这是 TypeScript 的要求，但增加了代码量）
- ✅ 类型安全：参数类型与 Schema 定义完全同步

### 3.4 输入验证机制

**评分：2.0**

**证据**：
- **无内置验证**：`typescript-graphql-schemas/grats/src/models/user.ts`（第 43-44、58-60 行）所有验证逻辑都需要手动编写
- **手动抛出错误**：使用 `GraphQLError` 手动抛出验证错误
- **验证逻辑分散**：验证代码分散在各个 Resolver 中，难以复用
- **无声明式验证 API**：不提供类似 `.refine()` 的声明式验证 API

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // 手动编写验证逻辑
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}

/** @gqlMutationField */
export function updateUser(
  id: Int,
  name?: string | null,
  email?: string | null
): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  if (name != null) user.name = name
  if (email != null) {
    // 验证逻辑重复
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    user.email = email
  }
  return user
}
```

**复杂验证示例**（`typescript-graphql-schemas/grats/src/models/order.ts` 第 77-82 行）：
```typescript
/** @gqlMutationField */
export function createOrder(userId: Int, items: Int[]): Order {
  // 多个验证条件需要手动编写
  if (!userMap.has(userId)) throw new GraphQLError('User not found')
  if (items.length === 0) throw new GraphQLError('At least one item is required')
  for (const id of items) {
    if (!menuMap.has(id)) throw new GraphQLError(`Menu item not found`)
  }
  // ...
}
```

**分析**：
- ❌ 无内置验证：所有验证逻辑都需要手动编写
- ❌ 验证逻辑分散：验证代码分散在各个 Resolver 中，难以复用
- ❌ 无声明式验证 API：不提供类似 `.refine()` 的声明式验证 API
- ⚠️ 可以通过辅助函数实现：可以创建验证辅助函数，但需要手动调用

### 3.5 批量加载（DataLoader）集成

**评分：0.0**

**证据**：
- **无内置 DataLoader 支持**：框架源码中未找到 DataLoader 相关实现
- **需要手动实现**：`examples/production-app/ViewerContext.ts` 展示需要手动创建 DataLoader 实例
- **需要手动配置 Context**：需要在 Context 中手动添加 DataLoader 实例

**实际使用示例**（`examples/production-app/ViewerContext.ts` 第 18-36 行）：
```typescript
import DataLoader from "dataloader";
import { getPostsByIds, getUsersByIds, getLikesByIds } from "./Database";

export class VC {
  _postLoader: DataLoader<string, Post>;
  _userLoader: DataLoader<string, User>;
  _likeLoader: DataLoader<string, Like>;
  
  constructor() {
    // 需要手动创建 DataLoader 实例
    this._postLoader = new DataLoader((ids) => getPostsByIds(this, ids));
    this._userLoader = new DataLoader((ids) => getUsersByIds(this, ids));
    this._likeLoader = new DataLoader((ids) => getLikesByIds(this, ids));
  }
  
  async getPostById(id: string): Promise<Post> {
    return this._postLoader.load(id);
  }
  // ...
}

/** @gqlContext */
export type Ctx = YogaInitialContext & { vc: VC; credits: number };
```

**在 Resolver 中使用**（需要手动调用）：
```typescript
/** @gqlField */
export function user(post: Post, vc: VC): User {
  // 需要手动调用 DataLoader
  return vc.getUserById(post.userId);
}
```

**分析**：
- ❌ 无内置支持：框架不提供任何 DataLoader 相关的 API 或工具
- ❌ 需要大量样板代码：需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入
- ❌ 无自动批处理：需要手动实现批处理逻辑
- ❌ 无缓存控制：需要手动实现缓存逻辑

### 评分详情

#### 3.1 开发体验（代码简洁度）

**得分：4.0**

**理由**：
- 函数式 API 简洁直观，符合 TypeScript 最佳实践
- 参数类型自动推断，无需手动声明
- 需要 JSDoc 注释，每个 Resolver 都需要标记
- 代码结构清晰，易于理解和维护

#### 3.2 模块化设计（领域驱动开发支持）

**得分：4.0**

**理由**：
- 支持按领域模块组织代码，类型定义和 Resolver 在同一模块中
- 提供了模块化 API，可以按领域拆分文件
- 不强制模块化，可以写出耦合的巨型文件（但通过设计可以避免）
- 代码组织清晰，易于维护和测试

#### 3.3 参数定义与类型推导

**得分：4.0**

**理由**：
- 参数类型大部分自动推断：通过 TypeScript 类型系统自动推断参数类型
- IDE 提示完善：TypeScript 完全理解参数类型，IDE 自动补全正常工作
- 需要显式声明参数：函数参数需要显式声明类型（虽然这是 TypeScript 的要求，但增加了代码量）
- 类型安全：参数类型与 Schema 定义完全同步

#### 3.4 输入验证机制

**得分：2.0**

**理由**：
- 无内置验证：所有验证逻辑都需要手动编写
- 验证逻辑分散：验证代码分散在各个 Resolver 中，难以复用
- 无声明式验证 API：不提供类似 `.refine()` 的声明式验证 API
- 可以通过辅助函数实现：可以创建验证辅助函数，但需要手动调用

#### 3.5 批量加载（DataLoader）集成

**得分：0.0**

**理由**：
- 无内置支持：框架不提供任何 DataLoader 相关的 API 或工具
- 需要大量样板代码：需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入
- 无自动批处理：需要手动实现批处理逻辑
- 无缓存控制：需要手动实现缓存逻辑

### 综合评分

**解析器与验证总分：2.8**

**优势**：
- 函数式 API 简洁直观，符合 TypeScript 最佳实践
- 参数类型自动推断，IDE 提示完善
- 支持按领域模块组织代码
- 类型安全，参数类型与 Schema 定义完全同步

**劣势**：
- 需要 JSDoc 注释，代码略显冗长
- 无内置验证，需要手动实现所有验证逻辑
- 无 DataLoader 支持，需要手动实现批处理
- 验证逻辑分散，难以复用

## 4. 内置功能 (Built-in Features)

Grats 提供了一些核心内置功能，但高级功能支持有限。核心功能（Directives、Scalars、Subscriptions、Context）都有原生支持，但中间件、查询复杂度分析等高级功能需要手动实现或通过第三方库实现。

### 功能概览表

| 功能                           | 状态            | 说明                                                                                                                                                        |
| :----------------------------- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指令支持（Directives）**     | ✅ 内置支持      | 通过 `@gqlDirective` 定义指令，通过 `@gqlAnnotate` 使用指令，支持所有 GraphQL 指令位置，API 简洁且类型安全                                                  |
| **扩展支持（Extensions）**     | ⚠️ 插件/额外实现 | 不内置支持，但可通过 `GraphQLError` 的 `extensions` 参数实现，需要手动处理                                                                                  |
| **自定义标量（Scalars）**      | ✅ 内置支持      | 通过 `@gqlScalar` 标记自定义标量类型，API 直观且类型安全                                                                                                    |
| **订阅（Subscription）**       | ✅ 内置支持      | 原生支持 GraphQL Subscriptions，通过 `@gqlSubscriptionField` 和 `AsyncIterable` 实现，支持实时数据推送，底层传输协议兼容性好（WebSocket, SSE 等），API 简洁 |
| **上下文（Context）注入**      | ✅ 内置支持      | 原生支持在 Resolver 中注入上下文，通过 `@gqlContext` 标记 Context 类型，支持派生 Context，类型推导完善，IDE 提示良好                                        |
| **中间件（Middleware）**       | ⛔ 无法实现      | 完全不支持中间件机制，无法在 Resolver 执行前后注入逻辑（如日志记录、权限检查、性能监控）                                                                    |
| **查询复杂度分析**             | ⛔ 无法实现      | 完全不支持查询复杂度分析，无法防止复杂查询攻击                                                                                                              |
| **深度限制（Depth Limiting）** | ⛔ 无法实现      | 完全不支持深度限制，无法防止深度查询攻击                                                                                                                    |
| **批量加载（DataLoader）**     | ⛔ 无法实现      | 无内置支持，需要手动创建 DataLoader 实例（已在 Phase 3 中评估）                                                                                             |

### 详细分析

#### 4.1 指令支持（Directives）

**状态：✅ 内置支持**

**证据**：
- **指令定义**：`src/Extractor.ts:67` 定义了 `DIRECTIVE_TAG = "gqlDirective"`
- **指令使用**：通过 `@gqlAnnotate` 标记使用指令（`src/Extractor.ts:68`）
- **支持所有指令位置**：支持 `FIELD_DEFINITION`、`ARGUMENT_DEFINITION`、`OBJECT`、`INTERFACE`、`ENUM`、`SCALAR`、`INPUT_OBJECT`、`INPUT_FIELD_DEFINITION`、`ENUM_VALUE`、`FRAGMENT_SPREAD`、`INLINE_FRAGMENT` 等所有 GraphQL 指令位置
- **指令参数验证**：`src/validations/validateDirectiveArguments.ts` 验证指令参数类型

**实际使用示例**（`src/tests/fixtures/directives/directiveOnFieldDefinition.ts`）：
```typescript
/**
 * This is my custom directive.
 * @gqlDirective on FIELD_DEFINITION
 */
export function max(args: { foo: Int }) {}

/**
 * All likes in the system. Note that there is no guarantee of order.
 * @gqlQueryField
 * @gqlAnnotate max(foo: 10)
 */
export function likes(args: { first?: Int | null }): string {
  return "hello";
}
```

**生成的 GraphQL Schema**：
```graphql
"""This is my custom directive."""
directive @max(foo: Int!) on FIELD_DEFINITION

type Query {
  """All likes in the system. Note that there is no guarantee of order."""
  likes(first: Int): String @max(foo: 10)
}
```

**指令实现示例**（`examples/production-app/graphql/directives.ts` 第 6-20 行）：
```typescript
/**
 * Some fields cost credits to access. This directive specifies how many credits
 * a given field costs.
 *
 * @gqlDirective cost on FIELD_DEFINITION
 */
export function debitCredits(args: { credits: Int }, context: Ctx): void {
  if (context.credits < args.credits) {
    throw new GraphQLError(
      `Insufficient credits remaining. This field cost ${args.credits} credits.`,
    );
  }
  context.credits -= args.credits;
}
```

**分析**：
- ✅ 原生支持定义和使用 GraphQL Directives
- ✅ 支持所有 GraphQL 指令位置
- ✅ API 简洁，通过 JSDoc 注释定义和使用
- ✅ 指令参数类型安全，自动验证
- ⚠️ 指令实现需要手动编写（如 `debitCredits` 函数），需要配合 `@graphql-tools/utils` 的 `mapSchema` 使用

#### 4.2 扩展支持（Extensions）

**状态：⚠️ 插件/额外实现**

**证据**：
- **不内置支持**：框架源码中未找到 Extensions 相关的原生 API
- **可以通过 GraphQLError 实现**：可以通过 `GraphQLError` 的 `extensions` 参数实现错误扩展
- **无法声明查询复杂度**：无法声明查询复杂度、执行时间等扩展信息

**代码示例**（需要手动实现）：
```typescript
import { GraphQLError } from 'graphql'

// 可以通过 GraphQLError 的 extensions 参数实现
throw new GraphQLError('Expected error with extensions', {
  extensions: { code: 'EXPECTED_ERROR' }
})
```

**分析**：
- ⚠️ 不内置支持 Extensions 的原生 API
- ⚠️ 可以通过 `GraphQLError` 的 `extensions` 参数实现，但需要手动处理
- ⚠️ 无法声明查询复杂度、执行时间等扩展信息
- ⚠️ 需要配合 GraphQL Server 的中间件或插件使用

#### 4.3 自定义标量（Scalars）

**状态：✅ 内置支持**

**证据**：
- **标量定义**：`src/Extractor.ts:62` 定义了 `SCALAR_TAG = "gqlScalar"`
- **实际使用**：`typescript-graphql-schemas/grats/src/graphql/CustomScalars.ts` 展示自定义标量定义
- **类型安全**：标量类型与 TypeScript 类型完全同步

**实际使用示例**（`typescript-graphql-schemas/grats/src/graphql/CustomScalars.ts`）：
```typescript
/** @gqlScalar */
export type DateTime = Date
```

**生成的 GraphQL Schema**（`schema.graphql` 第 4 行）：
```graphql
scalar DateTime
```

**生成的 TypeScript Schema**（`src/schema.ts` 第 121-124 行）：
```typescript
const DateTimeType: GraphQLScalarType = new GraphQLScalarType({
  name: "DateTime",
  ...config.scalars.DateTime
});
```

**分析**：
- ✅ 定义新标量类型简便，通过 `@gqlScalar` 标记即可
- ✅ API 直观，类型安全
- ⚠️ 不内置常用标量（如 DateTime、JSON、BigInt），需要手动定义或使用第三方库（如 `graphql-scalars`）
- ⚠️ 标量的序列化/反序列化逻辑需要在 Schema 配置中手动提供

#### 4.4 订阅（Subscription）

**状态：✅ 内置支持**

**证据**：
- **订阅字段标记**：`src/Extractor.ts:72` 定义了 `SUBSCRIPTION_FIELD_TAG = "gqlSubscriptionField"`
- **AsyncIterable 支持**：`src/validations/validateAsyncIterable.ts` 验证订阅字段必须返回 `AsyncIterable`
- **实际使用**：`examples/strict-semantic-nullability/Subscription.ts` 展示订阅的使用方式

**实际使用示例**（`examples/strict-semantic-nullability/Subscription.ts` 第 3-9 行）：
```typescript
/** @gqlSubscriptionField */
export async function* countdown(args: { from: Int }): AsyncIterable<Int> {
  for (let i = args.from; i >= 0; i--) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    yield i;
  }
}
```

**生成的 GraphQL Schema**：
```graphql
type Subscription {
  countdown(from: Int!): Int!
}
```

**AsyncIterable 验证**（`src/validations/validateAsyncIterable.ts`）：
- 要求所有 Subscription 字段必须返回 `AsyncIterable`
- 在构建 Schema 时自动验证

**分析**：
- ✅ 原生支持 GraphQL Subscriptions
- ✅ 支持实时数据推送，通过 async generator 实现
- ✅ 底层传输协议兼容性好（通过 graphql-yoga 支持 WebSocket、SSE 等）
- ✅ API 简洁，类型安全
- ✅ 自动验证订阅字段返回类型

#### 4.5 上下文（Context）注入

**状态：✅ 内置支持**

**证据**：
- **Context 标记**：`src/Extractor.ts:74` 定义了 `CONTEXT_TAG = "gqlContext"`
- **派生 Context**：支持通过 `@gqlContext` 函数定义派生 Context
- **参数解析**：`src/transforms/resolveResolverParams.ts` 自动识别和注入 Context 参数

**实际使用示例**（`examples/production-app/ViewerContext.ts` 第 48-54 行）：
```typescript
/** @gqlContext */
export type Ctx = YogaInitialContext & { vc: VC; credits: number }

/** @gqlContext */
export function getVc(ctx: Ctx): VC {
  return ctx.vc
}

// 在 Resolver 中使用
/** @gqlQueryField */
export function currentUser(vc: VC): User {
  // vc 类型自动推断为 VC，通过派生 Context 注入
  return vc.getUserById(vc.userId())
}
```

**分析**：
- ✅ 原生支持在 Resolver 中注入上下文
- ✅ 支持派生 Context，通过 `@gqlContext` 函数定义
- ✅ 上下文的类型推导完善，IDE 提示良好
- ✅ 自动识别 Context 参数，无需手动配置

#### 4.6 中间件（Middleware）

**状态：⛔ 无法实现**

**证据**：
- **未找到相关支持**：框架源码中未找到中间件相关的代码
- **无中间件 API**：不提供在 Resolver 执行前后注入逻辑的 API

**分析**：
- ❌ 完全不支持中间件机制
- ❌ 无法在 Resolver 执行前后注入逻辑（如日志记录、权限检查、性能监控）
- ⚠️ 可以通过手动包装 Resolver 实现类似功能，但需要额外样板代码
- ⚠️ 可以通过 GraphQL Server 的中间件实现（如 graphql-yoga 的插件系统）

#### 4.7 查询复杂度分析（Query Complexity）

**状态：⛔ 无法实现**

**证据**：
- **未找到相关支持**：框架源码中未找到查询复杂度相关的代码
- **无复杂度计算 API**：不提供查询复杂度计算和分析的 API

**分析**：
- ❌ 完全不支持查询复杂度分析
- ❌ 无法防止复杂查询攻击
- ⚠️ 可以通过 graphql-yoga 的插件实现（如 `graphql-query-complexity`），但需要额外配置

#### 4.8 深度限制（Depth Limiting）

**状态：⛔ 无法实现**

**证据**：
- **未找到相关支持**：框架源码中未找到深度限制相关的代码
- **无深度限制 API**：不提供查询深度限制的 API

**分析**：
- ❌ 完全不支持深度限制
- ❌ 无法防止深度查询攻击
- ⚠️ 可以通过 graphql-yoga 的插件实现（如 `graphql-depth-limit`），但需要额外配置

### 内置功能综合评分

**得分：<-待评分->**

**评分依据**：
- 核心功能支持良好：Directives、Scalars、Subscriptions、Context 都提供原生支持
- 高级功能支持有限：Middleware、Query Complexity、Depth Limiting 都不支持
- 功能完整性：9 个功能中，5 个内置支持，1 个插件/额外实现，3 个无法实现

**优势**：
1. **核心功能完善**：Directives、Scalars、Subscriptions、Context 都提供原生支持
2. **类型安全**：所有支持的功能都有完善的类型推导
3. **API 简洁**：支持的功能 API 直观易用

**劣势**：
1. **高级功能缺失**：Middleware、Query Complexity、Depth Limiting 都不支持
2. **需要手动实现**：一些功能（如指令实现）需要手动编写代码
3. **依赖第三方库**：一些功能需要配合 GraphQL Server 的插件使用

## 5. 生态集成 (Ecosystem Integration)

Grats 采用 **标准 GraphQL Schema 输出 + 手动集成** 的策略。通过 `getSchema()` 输出标准 `GraphQLSchema`，可以与任何 GraphQL Server 集成，但 ORM 和验证库需要手动集成。

### 核心集成策略

**源码证据**：
- Schema 输出：`typescript-graphql-schemas/grats/src/schema.ts` 的 `getSchema()` 函数输出标准 `GraphQLSchema` 实例
- 标准兼容：生成的 Schema 为标准 GraphQL.js 实例，兼容所有 GraphQL Server
- 官方示例：`examples/` 目录包含多个集成示例（Apollo Server、Yoga、Express GraphQL HTTP、Next.js）

### 5.1 ORM 集成深度（ORM Integration Depth）

**评分：<-待评分->**

**证据**：
- **无官方插件**：未找到 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- **需要手动集成**：`typescript-graphql-schemas/grats/src/models/user.ts` 中所有数据库操作都是手动实现（使用内存 Map）
- **类型同步需手动维护**：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步
- **官方示例**：`examples/production-app/Database.ts` 展示手动编写的数据库函数

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
// 需要手动定义 GraphQL 类型
/**
 * User information
 * @gqlType
 */
export type User = {
  /** @gqlField */
  id: Int
  /** @gqlField */
  name: string
  /** @gqlField */
  email: string
}

// 需要手动实现数据库查询
export const userMap = new Map<number, User>(USERS.map((u) => [u.id, { ...u } as unknown as User]))

/** @gqlQueryField */
export function users(): User[] {
  return Array.from(userMap.values())  // 手动查询
}

/** @gqlQueryField */
export function user(id: Int): User {
  const user = userMap.get(id)  // 手动查询
  if (!user) throw new GraphQLError('User not found')
  return user
}
```

**官方示例**（`examples/production-app/Database.ts`）：
- 所有数据库操作都是手动编写的函数
- 使用内存数组模拟数据库
- 需要手动实现所有 CRUD 操作

**分析**：
- ❌ 无官方插件：不提供 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- ❌ 需要大量胶水代码：必须手动编写所有数据库查询逻辑
- ❌ 类型同步需手动维护：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步
- ⚠️ 可以手动集成：虽然可以手动集成 ORM，但需要大量样板代码，且类型同步需要手动维护

### 5.2 验证库集成（Validation Library Integration）

**评分：<-待评分->**

**证据**：
- **无官方插件**：未找到 Zod、Yup、Valibot 等验证库的官方插件
- **需要手动集成**：所有验证逻辑都需要在 Resolver 中手动编写（`typescript-graphql-schemas/grats/src/models/user.ts` 第 43-44、58-60 行）
- **验证逻辑与 Schema 定义分离**：验证代码分散在各个 Resolver 中，难以复用

**实际使用示例**（`typescript-graphql-schemas/grats/src/models/user.ts`）：
```typescript
/** @gqlMutationField */
export function createUser(name: string, email: string): User {
  // 需要手动编写验证逻辑
  if (!email.includes('@')) {
    throw new GraphQLError('Invalid email format')
  }
  const id = incrementId()
  const newUser = { id, name, email } as unknown as User
  userMap.set(id, newUser)
  return newUser
}

/** @gqlMutationField */
export function updateUser(
  id: Int,
  name?: string | null,
  email?: string | null
): User {
  const user = userMap.get(id)
  if (!user) throw new GraphQLError('User not found')
  if (name != null) user.name = name
  if (email != null) {
    // 验证逻辑重复
    if (!email.includes('@')) {
      throw new GraphQLError('Invalid email format')
    }
    user.email = email
  }
  return user
}
```

**复杂验证示例**（`typescript-graphql-schemas/grats/src/models/order.ts` 第 77-82 行）：
```typescript
/** @gqlMutationField */
export function createOrder(userId: Int, items: Int[]): Order {
  // 多个验证条件需要手动编写
  if (!userMap.has(userId)) throw new GraphQLError('User not found')
  if (items.length === 0) throw new GraphQLError('At least one item is required')
  for (const id of items) {
    if (!menuMap.has(id)) throw new GraphQLError(`Menu item not found`)
  }
  // ...
}
```

**分析**：
- ❌ 无官方插件：不提供 Zod、Yup、Valibot 等验证库的官方插件
- ❌ 需要手动集成：所有验证逻辑都需要在 Resolver 中手动编写
- ❌ 验证逻辑与 Schema 定义分离：验证代码分散在各个 Resolver 中，难以复用
- ❌ 需要大量样板代码：每个验证场景都需要手动编写验证逻辑
- ⚠️ 可以手动集成：虽然可以手动集成验证库（如在 Resolver 中调用 Zod），但需要大量样板代码

### 5.3 GraphQL Server 兼容性（Server Compatibility）

**评分：<-待评分->**

**证据**：
- **输出标准 GraphQL Schema**：`typescript-graphql-schemas/grats/src/schema.ts` 的 `getSchema()` 函数输出标准 `GraphQLSchema` 实例
- **与标准 GraphQL.js 兼容**：生成的 Schema 为标准 GraphQL.js 实例，兼容所有 GraphQL Server
- **官方示例覆盖主流 Server**：`examples/` 目录包含多个集成示例：
  - Apollo Server（`examples/apollo-server/`）
  - GraphQL Yoga（`examples/yoga/`）
  - Express GraphQL HTTP（`examples/express-graphql-http/`）

**Apollo Server 集成**（`examples/apollo-server/server.ts`）：
```typescript
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { getSchema } from "./schema";

async function main() {
  const server = new ApolloServer({ schema: getSchema() });
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });
  console.log(`Running a GraphQL API server at ${url}`);
}
```

**GraphQL Yoga 集成**（`examples/yoga/server.ts`）：
```typescript
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { getSchema } from "./schema";

const yoga = createYoga({
  schema: getSchema(),
});

const server = createServer(yoga);
server.listen(4000, () => {
  console.log("Running a GraphQL API server at http://localhost:4000/graphql");
});
```

**Express GraphQL HTTP 集成**（`examples/express-graphql-http/server.ts`）：
```typescript
import * as express from "express";
import { createHandler } from "graphql-http/lib/use/express";
import { getSchema } from "./schema";

const app = express();
app.post(
  "/graphql",
  createHandler({
    schema: getSchema(),
  }),
);
app.listen(4000);
```

**分析**：
- ✅ 完全兼容：与所有主流 GraphQL Server 完全兼容
- ✅ 零配置：只需将生成的 Schema 传递给 Server 即可
- ✅ 官方示例完善：提供多个主流 Server 的集成示例
- ✅ 类型安全：Schema 配置接口类型安全（`SchemaConfig`）

### 5.4 Web 框架适配（Web Framework Adapter）

**评分：<-待评分->**

**证据**：
- **Next.js 官方示例**：`examples/next-js/` 提供完整的 Next.js App Router 集成示例
- **标准 GraphQL Server 集成**：其他框架可以通过标准 GraphQL Server 集成
- **官方文档**：`website/docs/05-examples/08-next-js.md` 提供 Next.js 集成文档

**Next.js 集成**（`examples/next-js/app/api/graphql/route.ts`）：
```typescript
// Next.js Custom Route Handler
import { createYoga } from "graphql-yoga";
import { getSchema } from "../../../schema";

const { handleRequest } = createYoga({
  schema: getSchema(),
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};
```

**其他框架集成**：
- 可以通过标准 GraphQL Server（如 Yoga、Apollo Server）集成到任何 Web 框架
- Express：通过 `express-graphql-http` 或 `graphql-yoga` 集成
- Fastify：通过 `graphql-yoga` 或 `mercurius` 集成
- Koa：通过 `graphql-yoga` 或 `apollo-server-koa` 集成
- Hono：通过 `graphql-yoga` 集成

**分析**：
- ✅ Next.js 官方示例：提供完整的 Next.js App Router 集成示例
- ✅ 标准集成方式：通过标准 GraphQL Server 可以集成到任何 Web 框架
- ⚠️ 需要手动适配：其他框架需要手动配置 GraphQL Server
- ✅ 类型安全：集成过程类型安全

### 评分详情

#### 5.1 ORM 集成深度（ORM Integration Depth）

**得分：<-待评分->**

**理由**：
- 无官方插件：不提供 Prisma、Drizzle、TypeORM 等 ORM 的官方插件
- 需要大量胶水代码：必须手动编写所有数据库查询逻辑
- 类型同步需手动维护：ORM 模型定义与 GraphQL Schema 定义分离，需要手动维护同步
- 可以手动集成：虽然可以手动集成 ORM，但需要大量样板代码

#### 5.2 验证库集成（Validation Library Integration）

**得分：<-待评分->**

**理由**：
- 无官方插件：不提供 Zod、Yup、Valibot 等验证库的官方插件
- 需要手动集成：所有验证逻辑都需要在 Resolver 中手动编写
- 验证逻辑与 Schema 定义分离：验证代码分散在各个 Resolver 中，难以复用
- 需要大量样板代码：每个验证场景都需要手动编写验证逻辑

#### 5.3 GraphQL Server 兼容性（Server Compatibility）

**得分：<-待评分->**

**理由**：
- 完全兼容：与所有主流 GraphQL Server 完全兼容
- 零配置：只需将生成的 Schema 传递给 Server 即可
- 官方示例完善：提供多个主流 Server 的集成示例
- 类型安全：Schema 配置接口类型安全

#### 5.4 Web 框架适配（Web Framework Adapter）

**得分：<-待评分->**

**理由**：
- Next.js 官方示例：提供完整的 Next.js App Router 集成示例
- 标准集成方式：通过标准 GraphQL Server 可以集成到任何 Web 框架
- 需要手动适配：其他框架需要手动配置 GraphQL Server
- 类型安全：集成过程类型安全

### 综合评分

**生态集成总分：<-待评分->**

**优势**：
- GraphQL Server 兼容性极佳，与所有主流 Server 完全兼容
- Next.js 官方示例完善
- 标准 GraphQL Schema 输出，集成简单

**劣势**：
- ORM 集成需要手动实现，无官方插件
- 验证库集成需要手动实现，无官方插件
- 需要大量样板代码，类型同步需要手动维护

## 📝 总结

### 总体评价

Grats 是一个基于 TypeScript 编译器插件的 GraphQL Schema 构建框架，采用 **Implementation-First** 方法，通过静态分析 TypeScript 代码生成 GraphQL Schema。总体评分为 **<-待评分->**。

### 核心优势

1. **轻量依赖**：仅 4 个运行时依赖，无装饰器、无反射元数据，符合最小依赖原则
2. **原生 TypeScript 语法**：完全支持原生 TypeScript 语法（Enum、Union、Interface），零配置
3. **强大的类型推断**：通过 TypeScript 编译器 API 深度分析类型结构，自动推断复杂类型
4. **GraphQL Server 兼容性极佳**：输出标准 GraphQL Schema，与所有主流 GraphQL Server 完全兼容
5. **接口字段自动继承**：实现接口时自动继承公共字段，减少重复代码

### 主要劣势

1. **需要构建步骤**：必须运行 CLI 命令生成 Schema，无法"即写即用"
2. **JSDoc 注释冗长**：每个 GraphQL 实体都需要 JSDoc 注释，代码略显冗长
3. **无内置验证**：所有验证逻辑都需要手动编写，验证代码分散，难以复用
4. **无 DataLoader 支持**：需要手动创建 DataLoader 实例，需要大量样板代码
5. **ORM 和验证库集成弱**：无官方插件，需要手动集成，类型同步需要手动维护
6. **高级功能缺失**：Middleware、Query Complexity、Depth Limiting 都不支持

### 适用场景

**适合**：
- 追求轻量依赖的项目
- 需要与现有 TypeScript 代码深度集成的项目
- 需要完全控制 Schema 生成过程的项目
- 团队熟悉 TypeScript 编译器 API 的项目

**不适合**：
- 需要"即写即用"体验的项目
- 需要内置验证和 DataLoader 支持的项目
- 需要深度 ORM 集成的项目
- 需要中间件和高级安全功能的项目

### 技术特点

- **架构模式**：静态分析（Static Analysis）+ 代码生成（Code Generation）
- **类型系统**：Implementation-First，TypeScript 代码即 Schema
- **构建流程**：显式构建，必须运行 CLI 命令
- **配置方式**：JSDoc 注释 + tsconfig.json 配置
- **生态集成**：标准 GraphQL Schema 输出，手动集成 ORM 和验证库

### 最终建议

Grats 适合追求轻量依赖和原生 TypeScript 语法的项目。如果项目需要内置验证、DataLoader 支持或深度 ORM 集成，建议考虑其他框架（如 GQLoom、garph 或 Pothos）。
<!-- 最终总结 -->

