# Pylon 评估报告 (2026 年 1 月)

> 本报告基于实际业务代码 (`typescript-graphql-schemas/pylon/src`) 及官方示例 (`@pylon/examples`) 生成。

## 📋 基本信息
| 项目         | 内容                               |
| :----------- | :--------------------------------- |
| **当前版本** | 2.9.6                              |
| **GitHub**   | https://github.com/getcronit/pylon |
| **文档站**   | https://pylon.cronit.io            |
| **初次提交** | 2023-11-24                         |
| **最近提交** | 2025-10-01                         |

## 📊 综合评分
| 维度                | 得分 (1-5) | 简评                                                         |
| :------------------ | :--------- | :----------------------------------------------------------- |
| **1. 架构模式**     | **2.5**    | Inference 模式，必须构建，深度集成 Hono                      |
| **2. 类型定义**     | **3.75**   | 深度推断，零配置枚举，智能接口检测，强大的类型推断能力       |
| **3. 解析器与验证** | **2.5**    | 代码简洁，类型自动推断，但验证和 DataLoader 需手动实现       |
| **4. 内置功能**     | **3.1**    | Context/Middleware/Subscriptions 完善，DataLoader 无内置支持 |
| **5. 生态集成**     | **1.0**    | ORM 基础集成，验证库无集成，框架绑定严重                     |

---

## 1. 架构模式 (Architecture)

### 架构模式概述

Pylon 采用 **Inference（自动推断）模式** 来构建 GraphQL Schema。框架使用 TypeScript Compiler API 静态分析源码，从 TypeScript 类型定义和 Resolver 函数签名自动推断并生成 GraphQL Schema。开发者只需编写 TypeScript 代码，无需手动定义 Schema，框架会在构建时自动生成 `.pylon/schema.graphql` 和 `.pylon/resolvers.js`。

**核心实现位置**：
- `packages/pylon-builder/src/schema/builder.ts`：`SchemaBuilder` 类，使用 TypeScript Compiler API 分析源码
- `packages/pylon-builder/src/schema/schema-parser.ts`：`SchemaParser` 类，解析类型定义并生成 GraphQL Schema
- `packages/pylon-builder/src/bundler/bundler.ts`：`Bundler` 类，负责代码打包和 Schema 注入
- `packages/pylon/src/define-pylon.ts`：运行时 Resolver 转换逻辑

**实际使用流程**：
```typescript
// 1. 编写 TypeScript 代码（src/index.ts）
export const graphql = {
  Query: {
    user: (id: Int): User => { ... }
  }
}

// 2. 运行构建命令
pylon build  // 或 pylon dev

// 3. 自动生成产物
// .pylon/schema.graphql - GraphQL Schema 定义
// .pylon/resolvers.js - Union 类型解析器
// .pylon/index.js - 打包后的应用代码
```

### 1.1 依赖复杂度 (Dependency Complexity)

**评分：3.0**

**核心依赖分析**：
- **运行时依赖**（`packages/pylon/package.json` 第 23-38 行）：
  - `graphql: ^16.9.0` - GraphQL 标准库
  - `graphql-yoga: ^5.6.2` - GraphQL Server 实现
  - `hono: ^4.0.8` - Web 框架（深度集成）
  - `@envelop/core: ^5.0.3` - GraphQL 插件系统
  - `graphql-scalars: ^1.24.0` - 常用标量类型
  - `@sentry/bun`, `@sentry/node` - 错误追踪
  - `jsonwebtoken`, `openid-client` - 认证支持
  - `consola`, `winston` - 日志库
  - `toucan-js` - Cloudflare Workers 错误追踪
- **开发依赖**（`packages/pylon-dev/package.json`）：
  - `@getcronit/pylon-builder` - Schema 构建工具（必需）
  - `@gqty/cli` - 客户端代码生成（可选）

**证据**：
```json
// packages/pylon/package.json
"dependencies": {
  "@envelop/core": "^5.0.3",
  "@envelop/disable-introspection": "^8.0.0",
  "@hono/sentry": "^1.2.0",
  "@sentry/bun": "^8.17.0",
  "@sentry/node": "^8.54.0",
  "consola": "^3.2.3",
  "graphql": "^16.9.0",
  "graphql-scalars": "^1.24.0",
  "graphql-yoga": "^5.6.2",
  "hono": "^4.0.8",
  "jsonwebtoken": "^9.0.2",
  "openid-client": "^5.6.4",
  "toucan-js": "^4.1.0",
  "winston": "^3.8.2"
}
```

**分析**：
- ⚠️ 运行时依赖较多（约 13 个），包含完整的 GraphQL Server 和 Web 框架
- ⚠️ 深度集成 Hono 框架，`app` 就是 Hono 实例（`packages/pylon/src/app/index.ts` 第 6 行）
- ⚠️ 内置 Sentry 集成，增加了依赖复杂度
- ✅ 不需要装饰器或反射元数据（`reflect-metadata`）
- ✅ 所有依赖都是标准 npm 包，无专有工具

**实际使用**（`typescript-graphql-schemas/pylon/package.json`）：
- 业务代码需要安装 `@getcronit/pylon` 和 `@getcronit/pylon-dev`
- 运行时依赖会传递安装，开发者无需手动管理

**结论**：中等依赖。需要引入多个第三方库（GraphQL Server、Web 框架、认证、日志等），但都是标准库，无专有工具。

### 1.2 构建流程 (Build Flow)

**评分：2.0**

**构建方式**：
- **必须运行构建命令**：`pylon build` 或 `pylon dev` 来生成 Schema（`packages/pylon-dev/src/index.ts` 第 19-37 行）
- **代码生成机制**：使用 TypeScript Compiler API 分析源码，生成 GraphQL Schema 和 Resolver 代码
- **构建产物**：生成 `.pylon/schema.graphql`、`.pylon/resolvers.js` 和 `.pylon/index.js`

**实际使用证据**：
```typescript
// typescript-graphql-schemas/pylon/package.json
"scripts": {
  "dev": "pylon dev",
  "build": "pylon build",
  "print": "pylon build && cp .pylon/schema.graphql schema.graphql"
}
```

**代码生成机制**：
- **Schema 生成**：`packages/pylon-builder/src/schema/builder.ts`（第 96-143 行）使用 TypeScript Compiler API 分析 `graphql` 导出
- **类型解析**：`packages/pylon-builder/src/schema/schema-parser.ts` 解析 TypeScript 类型并转换为 GraphQL 类型
- **代码注入**：`packages/pylon-builder/src/bundler/bundler.ts`（第 48-89 行）在构建时注入 Schema 和 Resolver 代码

**核心实现**：
```typescript
// packages/pylon-builder/src/index.ts:19-40
export const build = async (options: BuildOptions) => {
  const bundler = new Bundler(options.sfiFilePath, options.outputFilePath)
  
  return await bundler.build({
    getBuildDefs: () => {
      const builder = new SchemaBuilder(
        path.join(process.cwd(), options.sfiFilePath)
      )
      const built = builder.build()  // 使用 TypeScript Compiler API 分析
      
      return {
        typeDefs: built.typeDefs,      // 生成 GraphQL Schema
        resolvers: built.resolvers     // 生成 Union 类型解析器
      }
    },
    watch: options.watch,
    onWatch: options.onWatch
  })
}
```

**构建产物结构**：
```
.pylon/
├── schema.graphql    # 生成的 GraphQL Schema
├── resolvers.js      # 生成的 Union 类型解析器
└── index.js          # 打包后的应用代码（包含注入的 Schema）
```

**实际生成内容**（`typescript-graphql-schemas/pylon/.pylon/resolvers.js`）：
```javascript
export const resolvers = {
  MenuItem: {
    __resolveType: function resolveType(node) {
      if (node && typeof node === 'object') {
        if ("id" in node && "name" in node && "price" in node && 
            "sugarLevel" in node && "origin" in node) {
          return 'Coffee'
        }
        if ("id" in node && "name" in node && "price" in node && 
            "calories" in node) {
          return 'Dessert'
        }
      }
    }
  }
}
```

**不足之处**：
- ⚠️ **必须运行构建命令**：代码无法直接运行，必须先执行 `pylon build`
- ⚠️ **开发体验影响**：首次运行或 Schema 变更后需要等待构建完成
- ⚠️ **构建过程不透明**：使用 TypeScript Compiler API 和 esbuild，构建过程对开发者不透明
- ⚠️ **代码注入**：构建时通过 esbuild 插件注入 Schema 代码（`bundler.ts` 第 48-89 行），可能影响调试

**结论**：显式构建。必须运行 CLI 命令生成 Schema 文件或类型定义，代码才能通过编译或运行。构建过程使用 TypeScript Compiler API 和代码注入，相对复杂。

### 1.3 配置魔法 (Config & Language Magic)

**评分：3.0**

**技术实现**：
- **使用 TypeScript Compiler API**：通过静态分析 TypeScript 源码生成 Schema（`packages/pylon-builder/src/schema/builder.ts` 第 12-26 行）
- **不需要装饰器**：所有类型定义使用原生 TypeScript 类和接口
- **不需要反射元数据**：不依赖 `reflect-metadata` 或运行时反射
- **类型推断**：通过分析函数签名和返回类型自动推断 GraphQL 类型

**核心实现证据**：
```typescript
// packages/pylon-builder/src/schema/builder.ts:12-26
constructor(sfiFilePath: string) {
  this.sfiFilePath = sfiFilePath
  
  const tsConfigOptions = this.loadTsConfigOptions()
  
  const filesInSfiDir = ts.sys
    .readDirectory(path.dirname(this.sfiFilePath), ['.ts'], ['.d.ts'])
    .concat([path.join(path.dirname(this.sfiFilePath), '..', 'pylon.d.ts')])
  
  this.program = ts.createProgram(filesInSfiDir, tsConfigOptions)
  this.checker = this.program.getTypeChecker()  // 使用 TypeScript Compiler API
}
```

**实际使用方式**：
```typescript
// typescript-graphql-schemas/pylon/src/index.ts
// 完全原生 TypeScript，无装饰器
export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

export const graphql = {
  Query: {
    user: (id: Int): User => { ... }  // 函数签名自动推断类型
  }
}
```

**类型推断机制**：
- **函数参数推断**：从函数参数类型推断 GraphQL 输入类型（`packages/pylon-builder/src/schema/schema-parser.ts`）
- **返回类型推断**：从函数返回类型推断 GraphQL 输出类型
- **类属性推断**：从类的公共属性推断 GraphQL 字段类型
- **Union 类型推断**：从 TypeScript 联合类型自动生成 GraphQL Union 类型

**实际使用证据**：
```typescript
// typescript-graphql-schemas/pylon/src/index.ts:227-237
export const graphql = {
  Query: {
    users: (): User[] => { ... },           // 自动推断返回 [User!]!
    user: (id: Int): User => { ... },        // 自动推断参数 Int!，返回 User!
    menu: (): MenuItem[] => { ... }          // 自动推断 Union 类型
  }
}
```

**配置要求**：
- **TypeScript 配置**：需要标准的 `tsconfig.json`，但不需要特殊配置（`packages/pylon-builder/src/schema/builder.ts` 第 54-94 行）
- **无实验性特性**：不需要 `experimentalDecorators` 或 `emitDecoratorMetadata`
- **类型声明文件**：需要 `pylon.d.ts` 来扩展类型（`typescript-graphql-schemas/pylon/pylon.d.ts`）

**不足之处**：
- ⚠️ **构建时分析**：虽然不需要运行时反射，但需要构建时使用 TypeScript Compiler API，增加了构建复杂度
- ⚠️ **类型声明文件**：需要手动创建 `pylon.d.ts` 来扩展 Context 类型（虽然这是标准 TypeScript 实践）

**结论**：极简配置。仅需少量符合直觉的配置，主要依靠 TypeScript 自身的类型推断和 Compiler API 静态分析。不需要装饰器或反射元数据，但需要构建时分析。

### 1.4 生态集成 (Ecosystem Integration)

**评分：2.0**

**集成方式**：
- **深度集成 Hono**：`app` 就是 Hono 实例（`packages/pylon/src/app/index.ts` 第 6 行），无法更换底层框架
- **集成 GraphQL Yoga**：使用 GraphQL Yoga 作为 GraphQL Server（`packages/pylon/src/app/handler/pylon-handler.ts` 第 131-155 行）
- **支持 Envelop 插件**：通过 `config.plugins` 支持 Envelop 插件（`packages/pylon/src/index.ts` 第 21-27 行）

**核心实现证据**：
```typescript
// packages/pylon/src/app/index.ts:6
export const app = new Hono<Env>()  // 深度集成 Hono

// packages/pylon/src/app/handler/pylon-handler.ts:131-155
const yoga = createYoga({
  landingPage: false,
  graphqlEndpoint: '/graphql',
  ...config,
  graphiql: async () => resolveGraphiql(config),
  plugins: [
    useSentry(),
    useDisableIntrospection({ ... }),
    useViewer({ ... }),
    ...(config?.plugins || [])  // 支持 Envelop 插件
  ],
  schema
})
```

**部署平台支持**：
- **Cloudflare Workers**：官方示例（`examples/cloudflare-drizzle-d1`）展示 Cloudflare Workers 部署
- **Node.js**：支持标准 Node.js 环境（`packages/pylon/package.json` 第 40-42 行要求 Node >= 18）
- **Bun**：支持 Bun 运行时（官方示例 `examples/bun-testing`）
- **Deno**：支持 Deno 运行时（官方模板 `packages/create-pylon/templates/deno`）

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
import { app } from '@getcronit/pylon'

// app 就是 Hono 实例，可以直接使用 Hono 中间件
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

export default app  // 导出 Hono 应用
```

**官方示例**（`examples/` 目录）：
- `cloudflare-drizzle-d1`：Cloudflare Workers + Drizzle ORM 集成
- `nodejs-subscriptions`：Node.js 订阅支持
- `envelop-plugins`：Envelop 插件集成示例
- `interfaces-and-unions`：接口和联合类型示例

**不足之处**：
- ⚠️ **强框架绑定**：深度集成 Hono，无法更换底层 Web 框架
- ⚠️ **GraphQL Server 绑定**：使用 GraphQL Yoga，虽然可以通过 Envelop 插件扩展，但无法更换
- ⚠️ **安装方式**：虽然可以通过 `npm install` 安装，但框架设计假设使用 Hono，集成到其他框架需要适配

**结论**：环境敏感。虽然可安装，但对运行环境有特殊要求（必须使用 Hono 作为 Web 框架）。虽然支持多种运行时（Node.js、Bun、Deno、Cloudflare Workers），但底层框架绑定限制了灵活性。

### 架构模式综合评分

**得分：2.5**

**评分依据**：
- 依赖复杂度：<-待评分->（中等依赖，包含完整的 GraphQL Server 和 Web 框架）
- 构建流程：<-待评分->（显式构建，必须运行构建命令）
- 配置魔法：<-待评分->（极简配置，使用 TypeScript Compiler API 静态分析）
- 生态集成：<-待评分->（环境敏感，深度集成 Hono，无法灵活更换）

**优势**：
1. **自动类型推断**：通过 TypeScript Compiler API 自动从源码生成 Schema，减少手动定义
2. **零装饰器**：完全使用原生 TypeScript，不需要装饰器或反射元数据
3. **类型安全**：从 TypeScript 类型自动推断 GraphQL 类型，保证类型一致性
4. **多运行时支持**：支持 Node.js、Bun、Deno、Cloudflare Workers

**劣势**：
1. **必须构建**：无法直接运行，必须先执行构建命令生成 Schema
2. **框架绑定**：深度集成 Hono，无法更换底层 Web 框架
3. **依赖较多**：运行时依赖包含完整的 GraphQL Server 和 Web 框架
4. **构建复杂度**：使用 TypeScript Compiler API 和代码注入，构建过程相对复杂

## 2. 类型定义 (Type Definition)

### 核心实现机制

Pylon 采用 **TypeScript Compiler API 静态分析 + 自动推断** 的方式实现类型定义。框架通过分析 TypeScript 源码（类、接口、联合类型、函数签名）自动生成 GraphQL Schema，TypeScript 类型定义是单一数据源，GraphQL Schema 完全从 TypeScript 类型派生。

**源码证据**：
- 类型分析：`packages/pylon-builder/src/schema/builder.ts`（第 96-143 行）使用 TypeScript Compiler API 分析类型
- Schema 生成：`packages/pylon-builder/src/schema/schema-parser.ts`（第 558-1043 行）解析类型并生成 GraphQL Schema
- 业务代码示例：`typescript-graphql-schemas/pylon/src/index.ts`（第 13-87 行）定义 TypeScript 类型，自动生成 GraphQL Schema

**实际使用流程**：
```typescript
// 1. 定义 TypeScript 类型
export interface Food {
  id: Int
  name: string
  price: number
}

export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

export type MenuItem = Coffee | Dessert

// 2. 构建时自动生成 GraphQL Schema
// .pylon/schema.graphql 包含：
// interface MenuItem { id: Int!, name: String!, price: Number! }
// type Coffee implements MenuItem { ... }
// type Dessert implements MenuItem { ... }
```

### 评分详情

#### 2.1 单一数据源（Single Source of Truth）实现度

**评分：4.0**

**证据**：
- **TypeScript 类型是数据源**：`typescript-graphql-schemas/pylon/src/index.ts`（第 13-87 行）定义 TypeScript 类型
- **GraphQL Schema 自动生成**：从 TypeScript 类型自动生成 GraphQL Schema（`.pylon/schema.graphql`）
- **类型推断深度**：支持从类属性、函数签名、联合类型等自动推断 GraphQL 类型
- **验证逻辑分离**：验证需要手动使用 `createDecorator` 实现（第 129-168 行），不支持从验证规则自动生成类型

**代码示例**：
```typescript
// typescript-graphql-schemas/pylon/src/index.ts:13-17
export interface Food {
  id: Int
  name: string
  price: number
}

// 自动生成 GraphQL Schema：
// interface MenuItem {
//   id: Int!
//   name: String!
//   price: Number!
// }
```

**核心实现**（`packages/pylon-builder/src/schema/schema-parser.ts`）：
- 第 558-1043 行：`processSchemaReference` 方法分析 TypeScript 类型并生成 GraphQL Schema
- 第 955 行：使用 `getPublicPropertiesOfType` 获取类的公共属性
- 第 1019 行：检查类是否实现接口

**不足之处**：
- ⚠️ **验证逻辑分离**：验证需要手动实现（使用 `createDecorator`），不支持从验证规则（如 Zod）自动生成类型
- ⚠️ **需要显式类型标记**：某些类型需要显式使用 `Int`、`ID` 等标记类型（第 1 行），而不是纯 TypeScript 类型

**结论**：深度推断。核心定义即 Schema，GraphQL Schema 通过 TypeScript Compiler API 自动提取，仅需极少辅助配置。但验证逻辑需要手动实现，不支持从验证规则自动生成类型。

#### 2.2 枚举与字符串联合支持（Enum & String Union Types）

**评分：5.0**

**证据**：
- **零配置复用**：直接支持 TypeScript 字符串联合类型，无需手动注册
- **自动转换**：字符串联合类型自动转换为 GraphQL 枚举

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 第 10-11 行：定义字符串联合类型
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

**生成的 GraphQL Schema**（`.pylon/schema.graphql` 第 67-88 行）：
```graphql
enum OrderStatus {
	PENDING
	COMPLETED
	CANCELLED
}
enum SugarLevel {
	NONE
	LOW
	MEDIUM
	HIGH
}
enum SugarLevelInput {
	NONE
	LOW
	MEDIUM
	HIGH
}
enum OrderStatusInput {
	PENDING
	COMPLETED
	CANCELLED
}
```

**核心实现**（`packages/pylon-builder/src/schema/type-definition-builder.ts`）：
- 第 175-200 行：`isPrimitiveUnion` 检测字符串联合类型
- 第 185-197 行：枚举成员自动提取和转换
- 第 199-220 行：自动生成枚举类型名称

**官方示例**（`examples/interfaces-and-unions/src/index.ts`）：
- 支持多种联合类型场景：类联合、对象类型联合、接口联合等

**分析**：
- ✅ 完全零配置，直接使用 TypeScript 字符串联合类型
- ✅ 自动处理输入和输出枚举（生成 `SugarLevel` 和 `SugarLevelInput`）
- ✅ 枚举成员名称自动从字符串字面量提取，无需重复定义

**结论**：零配置复用。直接支持 TypeScript 原生字符串联合类型（`'A' | 'B'`），无需任何手动注册。枚举成员名称自动从字符串字面量提取，完全零配置。

#### 2.3 接口继承与联合类型体验（Interface & Union）

**评分：4.0**

**证据**：
- **接口自动继承**：类实现接口时，接口字段自动继承到 GraphQL Schema
- **Union 类型自动处理**：TypeScript 联合类型自动转换为 GraphQL Union 类型
- **智能接口检测**：框架自动检测 Union 类型中的公共字段，生成接口（`packages/pylon-builder/src/schema/schema-parser.ts` 第 313-348 行）

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 第 13-17 行：定义接口
export interface Food {
  id: Int
  name: string
  price: number
}

// 第 66-74 行：类实现接口
export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

// 第 87 行：定义联合类型
export type MenuItem = Coffee | Dessert
```

**生成的 GraphQL Schema**（`.pylon/schema.graphql`）：
```graphql
interface MenuItem {
  id: Int!
  name: String!
  price: Number!
}
type Coffee implements MenuItem {
  id: Int!
  name: String!
  price: Number!
  sugarLevel: SugarLevel!
  origin: String!
}
type Dessert implements MenuItem {
  id: Int!
  name: String!
  price: Number!
  calories: Number!
}
```

**核心实现**（`packages/pylon-builder/src/schema/schema-parser.ts`）：
- 第 201-230 行：检测 Union 类型中的公共字段，自动生成接口
- 第 234-273 行：处理类实现接口的情况
- 第 350-376 行：生成 `__resolveType` 函数用于 Union 类型解析

**生成的 Resolver**（`.pylon/resolvers.js`）：
```javascript
export const resolvers = {
  MenuItem: {
    __resolveType: function resolveType(node) {
      if (node && typeof node === 'object') {
        if ("id" in node && "name" in node && "price" in node && 
            "sugarLevel" in node && "origin" in node) {
          return 'Coffee'
        }
        if ("id" in node && "name" in node && "price" in node && 
            "calories" in node) {
          return 'Dessert'
        }
      }
    }
  }
}
```

**官方示例**（`examples/interfaces-and-unions/src/index.ts`）：
- 第 3-26 行：展示类实现接口
- 第 28-50 行：展示 Union 类型（有公共字段的情况，自动生成接口）
- 第 52-65 行：展示 Union 类型（无公共字段的情况）

**不足之处**：
- ⚠️ **Union 类型解析需要字段检查**：`__resolveType` 通过检查字段存在性来判断类型，需要确保对象包含足够的字段
- ⚠️ **需要手动返回 `__typename`**：在创建对象时需要手动设置 `__typename` 字段（第 300-307 行），虽然框架会生成解析器，但数据源需要包含类型信息

**结论**：智能继承。支持字段继承，Union 类型的决议通过自动生成的 `__resolveType` 函数处理，但需要确保对象包含足够的字段用于类型判断。框架会自动检测 Union 类型中的公共字段并生成接口。

#### 2.4 类型推断强度与显式声明平衡

**评分：3.5**

**证据**：
- **函数签名自动推断**：从函数参数和返回类型自动推断 GraphQL 类型
- **类属性自动推断**：从类的公共属性自动推断 GraphQL 字段类型
- **复杂类型支持**：支持 Promise、数组、可选类型、联合类型等

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 第 227-237 行：函数签名自动推断
export const graphql = {
  Query: {
    users: (): User[] => { ... },           // 自动推断返回 [User!]!
    user: (id: Int): User => { ... },        // 自动推断参数 Int!，返回 User!
    menu: (): MenuItem[] => { ... }          // 自动推断 Union 类型数组
  }
}
```

**核心实现**（`packages/pylon-builder/src/schema/schema-parser.ts`）：
- 第 842-1043 行：分析函数签名，自动推断参数类型和返回类型
- 第 82-87 行：支持 Promise 类型（`type-definition-builder.ts`）
- 第 159-174 行：支持数组类型（`type-definition-builder.ts`）
- 第 89-90 行：支持可选类型（`type-definition-builder.ts`）

**类型推断示例**：
```typescript
// Promise 类型自动处理
async orders(): Promise<Order[]> {
  // 自动推断返回 [Order!]!
}

// 可选参数自动处理
updateUser: (id: Int, name?: string, email?: string): User => {
  // 自动推断 name 和 email 为可选参数
}

// 数组类型自动处理
items: Int[]  // 自动推断为 [Int!]!
```

**不足之处**：
- ⚠️ **需要显式类型标记**：某些类型需要使用 `Int`、`ID` 等标记类型（第 1 行），而不是纯 TypeScript 的 `number`、`string`，这限制了完全自动推断的能力
- ⚠️ **Union 类型在输入字段中不支持**：输入参数中的 Union 类型会发出警告并默认使用第一个类型（`schema-parser.ts` 第 829-836 行）

**核心实现证据**：
```typescript
// packages/pylon-builder/src/schema/schema-parser.ts:829-836
if (firstType.isUnion() && !isPrimitive(firstType)) {
  consola.warn(
    `Warning: Union types in input fields are not supported yet. Defaulting to the first type (${this.checker.typeToString(
      firstType
    )}) at path: ${path.join(' > ')}`
  )
  firstType = firstType.types[0]
}
```

**分析**：
- ✅ **强大的自动推断能力**：函数签名、类属性、Promise、数组、可选类型等都能自动推断
- ✅ **TypeScript Compiler API 深度分析**：通过静态分析实现完整的类型推断
- ⚠️ **需要显式类型标记**：`Int`、`ID` 等标记类型需要显式使用，不能完全依赖原生 TypeScript 类型
- ⚠️ **输入字段 Union 限制**：输入参数中的 Union 类型不支持，这是一个明显的功能限制

**结论**：强大推断。通过 TypeScript Compiler API 能自动推导绝大部分类型，函数签名和类属性都能自动推断，支持 Promise、数组、可选类型等复杂场景。但需要显式类型标记（`Int`、`ID`）和输入字段 Union 不支持的限制影响了完全自动推断的能力。

### 类型定义综合评分

**得分：3.75**

**评分依据**：
- 单一数据源：**4.0**（深度推断，但验证逻辑需要手动实现）
- 枚举与字符串联合：**5.0**（零配置复用，完全自动）
- 接口继承与联合类型：**4.0**（智能继承，但需要字段检查）
- 类型推断强度：**3.5**（强大推断，函数签名和类属性自动推断，但需要显式类型标记）

**优势**：
1. **完全自动推断**：从 TypeScript 类型自动生成 GraphQL Schema，无需手动定义
2. **零配置枚举**：字符串联合类型自动转换为 GraphQL 枚举，完全零配置
3. **智能接口检测**：自动检测 Union 类型中的公共字段并生成接口
4. **类型安全**：通过 TypeScript Compiler API 保证类型一致性
5. **强大的类型推断**：函数签名、类属性、Promise、数组、可选类型等都能自动推断

**劣势**：
1. **验证逻辑分离**：验证需要手动实现，不支持从验证规则自动生成类型
2. **需要显式类型标记**：某些类型需要使用 `Int`、`ID` 等标记类型，不能完全依赖原生 TypeScript 类型
3. **输入字段 Union 不支持**：输入参数中的 Union 类型会发出警告并默认使用第一个类型

## 3. 解析器与验证 (Resolvers & Validation)

### 核心实现机制

Pylon 采用 **函数式 Resolver + 装饰器验证** 的方式实现解析器定义。Resolver 直接定义为普通函数，参数类型从函数签名自动推断，验证通过 `createDecorator` 实现，Field Resolver 通过类的异步方法实现，DataLoader 需要手动创建和集成。

**源码证据**：
- Resolver 转换：`packages/pylon/src/define-pylon.ts`（第 165-347 行）将函数式 Resolver 转换为 GraphQL Resolver
- 参数处理：`packages/pylon/src/define-pylon.ts`（第 110-158 行）`spreadFunctionArguments` 函数处理参数映射
- 验证装饰器：`packages/pylon/src/create-decorator.ts`（第 3-68 行）实现验证装饰器
- 业务代码示例：`typescript-graphql-schemas/pylon/src/index.ts`（第 227-398 行）展示 Resolver 定义

**实际使用流程**：
```typescript
// 1. 定义 Resolver 函数
export const graphql = {
  Query: {
    user: (id: Int): User => {
      const u = userMap.get(id)
      if (!u) throw new GraphQLError('User not found')
      return new User(u.id, u.name, u.email)
    }
  },
  Mutation: {
    createUser: validateEmail((name: string, email: string): User => {
      // 验证逻辑在 validateEmail 装饰器中
      const id = incrementId()
      return new User(id, name, email)
    })
  }
}

// 2. Field Resolver 通过类方法实现
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

### 评分详情

#### 3.1 开发体验（代码简洁度）

**评分：4.5**

**证据**：
- **函数式定义**：`typescript-graphql-schemas/pylon/src/index.ts`（第 227-270 行）直接使用函数定义 Resolver，代码极简
- **类型自动推断**：函数参数和返回类型自动推断，无需手动声明 GraphQL 类型
- **验证装饰器**：使用 `createDecorator` 实现验证，代码简洁（第 129-168 行）
- **Field Resolver 简洁**：通过类的异步方法实现，代码直观（第 96-99 行）

**代码示例**：
```typescript
// Query Resolver - 极简定义
export const graphql = {
  Query: {
    users: (): User[] => {
      return Array.from(userMap.values()).map((u) => new User(u.id, u.name, u.email))
    },
    user: (id: Int): User => {
      const u = userMap.get(id)
      if (!u) throw new GraphQLError('User not found')
      return new User(u.id, u.name, u.email)
    }
  },
  Mutation: {
    createUser: validateEmail((name: string, email: string): User => {
      const id = incrementId()
      return new User(id, name, email)
    })
  }
}

// Field Resolver - 通过类方法实现
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**核心实现**（`packages/pylon/src/define-pylon.ts`）：
- 第 165-347 行：`resolversToGraphQLResolvers` 函数将函数式 Resolver 转换为 GraphQL Resolver
- 第 110-158 行：`spreadFunctionArguments` 函数处理参数映射，从 GraphQL 参数映射到函数参数
- 第 44-109 行：`wrapFunctionsRecursively` 函数递归包装函数，支持嵌套对象和方法

**不足之处**：
- ⚠️ **需要手动创建 DataLoader**：DataLoader 需要手动创建和配置（第 174-213 行）
- ⚠️ **需要手动设置 Context**：需要在中间件中手动设置 loaders（第 222-225 行）

**分析**：
- ✅ 代码极简：函数式定义，几乎无样板代码
- ✅ 类型自动推断：参数类型和返回类型完全自动推断
- ✅ 验证装饰器简洁：使用 `createDecorator` 实现验证，代码清晰
- ⚠️ DataLoader 需要手动集成：需要手动创建和配置，样板代码较多

**结论**：代码简洁，模板代码量中等。函数式定义极简，类型自动推断，但 DataLoader 需要手动集成。

#### 3.2 模块化设计（领域驱动开发支持）

**评分：0.0**

**证据**：
- **按操作类型组织**：所有 Resolver 都在一个 `graphql` 对象中，按 Query/Mutation 组织（`typescript-graphql-schemas/pylon/src/index.ts` 第 227-398 行）
- **类型定义与 Resolver 分离**：类型定义（第 13-123 行）和 Resolver（第 227-398 行）在同一文件中，但逻辑分离
- **Field Resolver 在类中**：Field Resolver 通过类方法实现（第 96-122 行），与类型定义在一起
- **需要手动组织**：框架不强制模块化，需要开发者自觉按领域拆分文件

**代码示例**：
```typescript
// 所有 Resolver 都在一个对象中
export const graphql = {
  Query: {
    // User queries
    users: (): User[] => { ... },
    user: (id: Int): User => { ... },
    
    // Menu queries
    menu: (): MenuItem[] => { ... },
    menuItem: (id: Int): MenuItem | undefined => { ... },
    
    // Order queries
    orders: (): Order[] => { ... },
    order: (id: Int): Order | undefined => { ... },
  },
  Mutation: {
    // User mutations
    createUser: validateEmail((name: string, email: string): User => { ... }),
    // Menu mutations
    createCoffee: (name: string, price: number, ...): Coffee => { ... },
    // Order mutations
    createOrder: validateCreateOrder((userId: Int, items: Int[]): Order => { ... }),
  }
}
```

**分析**：
- ⚠️ **无模块化考虑**：完全按操作类型隔离接口，所有 Query/Mutation 都在一个对象中
- ⚠️ **容易写出耦合的巨型文件**：随着业务增长，单个文件会变得很大
- ✅ **Field Resolver 在类中**：Field Resolver 通过类方法实现，与类型定义在一起，逻辑清晰
- ⚠️ **需要手动合并**：如果按领域拆分文件，需要手动合并 `graphql` 对象

**结论**：无模块化考虑。完全按操作类型（Query/Mutation）组织，需要手动合并数组或对象，容易写出耦合的巨型文件。

#### 3.3 参数定义与类型推导

**评分：5.0**

**证据**：
- **参数类型完全自动推断**：从函数签名自动推断 GraphQL 参数类型（`packages/pylon/src/define-pylon.ts` 第 218-235 行）
- **支持可选参数**：TypeScript 可选参数自动转换为 GraphQL 可选参数（`typescript-graphql-schemas/pylon/src/index.ts` 第 279 行）
- **参数顺序自动处理**：`spreadFunctionArguments` 函数自动处理参数顺序（`packages/pylon/src/define-pylon.ts` 第 110-158 行）

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 参数类型完全自动推断
user: (id: Int): User => { ... }  // 自动推断参数 Int!

// 可选参数自动处理
updateUser: (id: Int, name?: string, email?: string): User => {
  // name 和 email 自动推断为可选参数
}

// 数组参数自动处理
createOrder: (userId: Int, items: Int[]): Order => {
  // items 自动推断为 [Int!]!
}
```

**核心实现**（`packages/pylon/src/define-pylon.ts`）：
- 第 218-235 行：从 GraphQL Schema 获取字段参数，自动映射到函数参数
- 第 110-158 行：`spreadFunctionArguments` 函数处理参数映射和顺序
- 第 144 行：`orderedArgs` 自动按函数参数顺序排列

**生成的 GraphQL Schema**（`.pylon/schema.graphql`）：
```graphql
type Query {
  user(id: Int!): User!
}

type Mutation {
  updateUser(id: Int!, name: String, email: String): User!
  createOrder(userId: Int!, items: [Int!]!): Order!
}
```

**分析**：
- ✅ 参数类型完全自动推断，无需手动声明
- ✅ 支持可选参数，自动转换为 GraphQL 可选参数
- ✅ 支持数组参数，自动推断为列表类型
- ✅ IDE 提示完善，类型从 Schema 定义自动推导

**结论**：参数类型完全自动推断，无需手动声明，IDE 提示完善。支持链式 API 或函数参数自动推断，类型从 Schema 定义自动推导。

#### 3.4 输入验证机制

**评分：3.0**

**证据**：
- **装饰器验证**：使用 `createDecorator` 实现验证（`packages/pylon/src/create-decorator.ts` 第 3-68 行）
- **验证逻辑分离**：验证逻辑与业务逻辑分离，代码清晰（`typescript-graphql-schemas/pylon/src/index.ts` 第 129-168 行）
- **需要手动编写验证逻辑**：所有验证逻辑都需要手动实现（第 129-168 行）

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 定义验证装饰器
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// 使用验证装饰器
createUser: validateEmail((name: string, email: string): User => {
  // 验证逻辑在装饰器中执行
  const id = incrementId()
  return new User(id, name, email)
})
```

**核心实现**（`packages/pylon/src/create-decorator.ts`）：
- 第 3-68 行：`createDecorator` 函数实现验证装饰器
- 第 24-27 行：装饰器在函数执行前执行验证逻辑
- 第 35-40 行：支持函数装饰器模式

**验证示例**：
```typescript
// 复杂验证逻辑
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

**不足之处**：
- ⚠️ **无内置验证**：不支持声明式验证（如 `z.email()`），需要手动编写验证逻辑
- ⚠️ **验证代码重复**：每个验证逻辑都需要手动实现，验证代码可能重复
- ⚠️ **无格式验证**：不支持格式验证（如邮箱格式、URL 格式等），需要手动实现

**分析**：
- ✅ 验证逻辑与业务逻辑分离，代码清晰
- ✅ 使用装饰器模式，易于复用
- ⚠️ 需要手动编写验证逻辑，不支持声明式验证
- ⚠️ 验证代码可能重复，无内置验证库集成

**结论**：支持验证，但需要手动编写验证逻辑。需要手动调用验证函数，验证代码和业务逻辑混合。所有验证逻辑都需要在 Resolver 中手动编写，验证代码重复。

#### 3.5 批量加载（DataLoader）集成

**评分：<-待评分->**

**证据**：
- **需要手动创建 DataLoader**：DataLoader 需要手动创建和配置（`typescript-graphql-schemas/pylon/src/index.ts` 第 174-213 行）
- **需要手动设置 Context**：需要在中间件中手动设置 loaders（第 222-225 行）
- **需要手动调用**：在 Field Resolver 中需要手动调用 loaders（第 96-122 行）

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 1. 手动创建 DataLoader
export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      // 批量加载逻辑
      return userIds.map((id) => orderGroups.get(id) ?? [])
    }),
    users: new DataLoader<number, User>(async (userIds) => {
      return userIds.map((id) => {
        const u = userMap.get(id)
        if (!u) return new Error('User not found')
        return new User(u.id, u.name, u.email)
      })
    }),
  }
}

// 2. 手动设置 Context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

// 3. 手动调用 DataLoader
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**分析**：
- ⚠️ **需要手动创建 DataLoader 实例**：每个 DataLoader 都需要手动创建和配置
- ⚠️ **需要手动定义 Context 类型**：需要在 `pylon.d.ts` 中手动定义 Context 类型（`typescript-graphql-schemas/pylon/pylon.d.ts`）
- ⚠️ **需要手动设置 Context**：需要在中间件中手动设置 loaders
- ⚠️ **需要手动调用**：在 Field Resolver 中需要手动调用 loaders
- ⚠️ **样板代码很多**：需要大量样板代码来集成 DataLoader

**结论**：没有提供任何内置的 dataloader 支持，需要大量 context 样板代码和 dataloader 样板代码。需要手动创建 DataLoader 实例、定义 Context 类型、配置 Context 注入，样板代码很多。

### 解析器与验证综合评分

**得分：2.5**

**评分依据**：
- 开发体验：4.5（代码简洁，但 DataLoader 需要手动集成）
- 模块化设计：0.0（无模块化考虑，完全按操作类型组织）
- 参数定义与类型推导：5.0（参数类型完全自动推断）
- 输入验证机制：3.0（支持验证，但需要手动编写验证逻辑）
- 批量加载（DataLoader）集成：0.0（无内置支持，需要大量样板代码）

**优势**：
1. **代码极简**：函数式定义，几乎无样板代码
2. **类型自动推断**：参数类型和返回类型完全自动推断
3. **验证装饰器**：使用 `createDecorator` 实现验证，代码清晰
4. **Field Resolver 简洁**：通过类的异步方法实现，代码直观

**劣势**：
1. **无模块化支持**：完全按操作类型组织，容易写出耦合的巨型文件
2. **验证需要手动实现**：不支持声明式验证，需要手动编写验证逻辑
3. **DataLoader 需要手动集成**：需要大量样板代码来集成 DataLoader
4. **Context 需要手动配置**：需要手动设置 Context 和类型定义

## 4. 内置功能 (Built-in Features)

### 功能支持概览

Pylon 通过深度集成 Hono 和 GraphQL Yoga，提供了一些内置功能，同时通过 Envelop 插件系统支持扩展功能。核心功能包括 Context 注入、Middleware 支持、自定义标量、Subscriptions 等，但 DataLoader、Directives、查询复杂度分析等功能需要手动实现或通过插件实现。

### 功能支持详情

| 功能                           | 支持情况        | 说明                                                                 |
| :----------------------------- | :-------------- | :------------------------------------------------------------------- |
| **指令支持（Directives）**     | ⚠️ 插件/额外实现 | 不内置支持，但可通过 Envelop 插件实现，需要额外配置                  |
| **扩展支持（Extensions）**     | ⚠️ 插件/额外实现 | 不内置支持，但可通过 Envelop 插件实现，需要额外配置                  |
| **批量加载（DataLoader）**     | ⛔ 无法实现      | 没有提供任何内置的 dataloader 支持，需要手动创建和配置               |
| **自定义标量（Scalars）**      | ✅ 内置支持      | 内置了 Date, JSON, Object, Void, Number 等常用标量类型               |
| **订阅（Subscription）**       | ✅ 内置支持      | 原生支持 GraphQL Subscriptions，通过 `experimentalCreatePubSub` 实现 |
| **上下文（Context）注入**      | ✅ 内置支持      | 原生支持在 Resolver 中注入上下文，通过 `getContext()` 实现           |
| **中间件（Middleware）**       | ✅ 内置支持      | 原生支持 Hono 中间件，可在 Resolver 执行前后注入逻辑                 |
| **查询复杂度分析**             | ⚠️ 插件/额外实现 | 不内置支持，但可通过 Envelop 插件实现，需要额外配置                  |
| **深度限制（Depth Limiting）** | ⚠️ 插件/额外实现 | 不内置支持，但可通过 Envelop 插件实现，需要额外配置                  |

### 详细功能分析

#### 4.1 指令支持（Directives）

**支持情况：⚠️ 插件/额外实现**

**证据**：
- **无内置支持**：`packages/pylon/src` 中没有找到 Directives 相关的实现
- **可通过 Envelop 插件实现**：`packages/pylon/src/app/handler/pylon-handler.ts`（第 152 行）支持通过 `config.plugins` 添加 Envelop 插件
- **需要额外配置**：需要手动安装和配置 Envelop Directives 插件

**实现方式**：
```typescript
// 通过 Envelop 插件实现 Directives
import { useSchema } from '@envelop/core'
import { useDirective } from '@envelop/directives'

export const config: PylonConfig = {
  plugins: [
    useDirective({
      // Directives 配置
    })
  ]
}
```

**结论**：不内置支持，但可通过官方插件、社区插件或手动实现 Directives 功能，需要额外配置和样板代码。

#### 4.2 扩展支持（Extensions）

**支持情况：⚠️ 插件/额外实现**

**证据**：
- **无内置支持**：`packages/pylon/src` 中没有找到 Extensions 相关的实现
- **可通过 Envelop 插件实现**：支持通过 `config.plugins` 添加 Envelop 插件（`packages/pylon/src/app/handler/pylon-handler.ts` 第 152 行）
- **ServiceError 支持 extensions**：`packages/pylon/src/define-pylon.ts`（第 349-367 行）`ServiceError` 类支持 `extensions` 字段

**实现方式**：
```typescript
// 通过 Envelop 插件实现 Extensions
import { useExtendContext } from '@envelop/core'

export const config: PylonConfig = {
  plugins: [
    useExtendContext(async (context) => {
      return {
        // 扩展信息
      }
    })
  ]
}
```

**结论**：不内置支持，但可通过插件或手动扩展 Context 来实现类似功能，需要额外配置。

#### 4.3 批量加载（DataLoader）集成

**支持情况：⛔ 无法实现**

**证据**：
- **无内置支持**：`packages/pylon/src` 中没有找到 DataLoader 相关的内置实现
- **需要手动创建**：`typescript-graphql-schemas/pylon/src/index.ts`（第 174-213 行）需要手动创建 DataLoader 实例
- **需要手动设置 Context**：需要在中间件中手动设置 loaders（第 222-225 行）
- **需要手动调用**：在 Field Resolver 中需要手动调用 loaders（第 96-122 行）

**实际使用**：
```typescript
// 1. 手动创建 DataLoader
export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      // 批量加载逻辑
    }),
  }
}

// 2. 手动设置 Context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

// 3. 手动调用 DataLoader
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**结论**：没有提供任何内置的 dataloader 支持，且无法通过插件实现，需要大量 context 样板代码和 dataloader 样板代码。

#### 4.4 自定义标量（Scalars）

**支持情况：✅ 内置支持**

**证据**：
- **内置常用标量**：`packages/pylon/src/app/handler/pylon-handler.ts`（第 68-104 行）内置了 Date, JSON, Object, Void, Number 等标量类型
- **使用 graphql-scalars**：第 2-7 行导入 `graphql-scalars` 库的标量类型
- **自定义 Number 标量**：第 73-104 行定义了自定义 `Number` 标量，支持整数和浮点数

**内置标量类型**：
```typescript
// packages/pylon/src/app/handler/pylon-handler.ts:68-104
resolvers: {
  Date: DateTimeISOResolver,      // 日期时间标量
  JSON: JSONResolver,              // JSON 标量
  Object: JSONObjectResolver,      // 对象标量
  Void: GraphQLVoid,               // 空值标量
  Number: new GraphQLScalarType({  // 自定义数字标量
    name: 'Number',
    description: 'Custom scalar that handles both integers and floats',
    parseValue(value) { ... },
    parseLiteral(ast) { ... },
    serialize(value) { ... }
  })
}
```

**结论**：内置了常用的标量类型（如 `DateTime`, `JSON`, `BigInt`, `Date` 等），定义新标量类型简便，API 直观且类型安全。

#### 4.5 订阅（Subscription）

**支持情况：✅ 内置支持**

**证据**：
- **原生支持**：`packages/pylon/src/index.ts`（第 19 行）导出 `experimentalCreatePubSub`
- **官方示例**：`examples/nodejs-subscriptions/src/index.ts` 展示了 Subscription 的使用
- **GraphQL Yoga 支持**：底层使用 GraphQL Yoga，原生支持 Subscriptions

**实际使用**（`examples/nodejs-subscriptions/src/index.ts`）：
```typescript
import { experimentalCreatePubSub } from '@getcronit/pylon'

const pubSub = experimentalCreatePubSub<{
  [Events.postCreated]: [post: Post]
}>()

export const graphql = {
  Query: {
    posts
  },
  Mutation: {
    createPost: Post.create
  },
  Subscription: {
    postCreated: () => pubSub.subscribe(Events.postCreated)
  }
}
```

**核心实现**：
- `packages/pylon/src/index.ts`（第 19 行）：导出 `experimentalCreatePubSub`，来自 `graphql-yoga`
- `packages/pylon/src/define-pylon.ts`（第 306-320 行）：支持 Subscription Resolver 转换

**结论**：原生支持 GraphQL Subscriptions，支持实时数据推送，底层传输协议兼容性好（WebSocket, SSE 等），API 简洁。

#### 4.6 上下文（Context）注入

**支持情况：✅ 内置支持**

**证据**：
- **原生支持**：`packages/pylon/src/context.ts`（第 29-51 行）实现了 `asyncContext` 和 `getContext()`
- **类型推导完善**：`packages/pylon/src/context.ts`（第 9-27 行）定义了 `Context` 类型，类型推导完善
- **IDE 提示良好**：通过 `getContext()` 获取上下文，类型安全

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 获取 Context
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}

// 设置 Context（通过 Hono 中间件）
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**核心实现**（`packages/pylon/src/context.ts`）：
- 第 29 行：`asyncContext` 使用 `AsyncLocalStorage` 实现上下文存储
- 第 31-47 行：`getContext()` 函数获取当前上下文
- 第 49-51 行：`setContext()` 函数设置上下文

**结论**：原生支持在 Resolver 中注入上下文，上下文的类型推导完善，IDE 提示良好，无需手动类型声明。

#### 4.7 中间件（Middleware）

**支持情况：✅ 内置支持**

**证据**：
- **Hono 中间件**：`packages/pylon/src/app/index.ts`（第 6 行）`app` 是 Hono 实例，支持所有 Hono 中间件
- **内置中间件**：第 8 行使用 Sentry 中间件，第 10-20 行使用 AsyncLocalStorage 中间件
- **支持链式调用**：可以链式调用多个中间件

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 使用 Hono 中间件
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**核心实现**（`packages/pylon/src/app/index.ts`）：
- 第 6 行：`app` 是 Hono 实例
- 第 8 行：内置 Sentry 中间件
- 第 10-20 行：AsyncLocalStorage 中间件，用于上下文管理
- 第 22-26 行：请求 ID 中间件

**结论**：原生支持在 Resolver 执行前后注入中间件逻辑（如日志记录、权限检查、性能监控），API 简洁，支持链式调用。

#### 4.8 查询复杂度分析（Query Complexity）

**支持情况：⚠️ 插件/额外实现**

**证据**：
- **无内置支持**：`packages/pylon/src` 中没有找到查询复杂度分析相关的实现
- **可通过 Envelop 插件实现**：支持通过 `config.plugins` 添加 Envelop 插件（`packages/pylon/src/app/handler/pylon-handler.ts` 第 152 行）

**实现方式**：
```typescript
// 通过 Envelop 插件实现查询复杂度分析
import { useQueryComplexity } from '@envelop/query-complexity'

export const config: PylonConfig = {
  plugins: [
    useQueryComplexity({
      // 复杂度配置
    })
  ]
}
```

**结论**：不内置支持，但可通过插件或手动实现复杂度分析，需要额外配置和自定义逻辑。

#### 4.9 深度限制（Depth Limiting）

**支持情况：⚠️ 插件/额外实现**

**证据**：
- **无内置支持**：`packages/pylon/src` 中没有找到深度限制相关的实现
- **可通过 Envelop 插件实现**：支持通过 `config.plugins` 添加 Envelop 插件（`packages/pylon/src/app/handler/pylon-handler.ts` 第 152 行）

**实现方式**：
```typescript
// 通过 Envelop 插件实现深度限制
import { useDepthLimit } from '@envelop/depth-limit'

export const config: PylonConfig = {
  plugins: [
    useDepthLimit({
      maxDepth: 10
    })
  ]
}
```

**结论**：不内置支持，但可通过插件或手动实现深度限制，需要额外配置。

### 内置功能综合评分

**得分：3.1**

**评分依据**：
- Directives：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- Extensions：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- DataLoader：⛔ 无法实现（0分）- 没有提供任何内置的 dataloader 支持
- Scalars：✅ 内置支持（5分）- 内置了 Date, JSON, Object, Void, Number 等常用标量类型
- Subscription：✅ 内置支持（5分）- 原生支持，通过 `experimentalCreatePubSub` 实现
- Context：✅ 内置支持（5分）- 原生支持，通过 `getContext()` 实现
- Middleware：✅ 内置支持（5分）- 原生支持 Hono 中间件，可在 Resolver 执行前后注入逻辑
- Query Complexity：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- Depth Limiting：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现

**总分：28/45 = 3.1/5.0**

**评分依据**：
- 指令支持：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- 扩展支持：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- 批量加载：⛔ 无法实现（0分）- 没有提供任何内置的 dataloader 支持
- 自定义标量：✅ 内置支持（5分）- 内置了 Date, JSON, Object, Void, Number 等常用标量类型
- 订阅：✅ 内置支持（5分）- 原生支持，通过 `experimentalCreatePubSub` 实现
- 上下文注入：✅ 内置支持（5分）- 原生支持，通过 `getContext()` 实现
- 中间件：✅ 内置支持（5分）- 原生支持 Hono 中间件，可在 Resolver 执行前后注入逻辑
- 查询复杂度分析：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现
- 深度限制：⚠️ 插件/额外实现（2分）- 不内置支持，但可通过 Envelop 插件实现

**优势**：
1. **Context 注入完善**：原生支持上下文注入，类型推导完善
2. **Middleware 支持**：通过 Hono 中间件支持，功能强大
3. **自定义标量丰富**：内置了常用的标量类型
4. **Subscriptions 支持**：原生支持 GraphQL Subscriptions

**劣势**：
1. **DataLoader 无内置支持**：需要手动创建和配置，样板代码多
2. **Directives 无内置支持**：需要通过 Envelop 插件实现
3. **查询复杂度分析无内置支持**：需要通过 Envelop 插件实现
4. **深度限制无内置支持**：需要通过 Envelop 插件实现

## 5. 生态集成 (Ecosystem Integration)

### 生态集成概览

Pylon 通过深度集成 Hono 和 GraphQL Yoga，提供了良好的运行时兼容性，支持多种运行时（Node.js、Bun、Deno、Cloudflare Workers）。在 ORM 集成方面，官方推荐使用 Prisma，并提供了 `@getcronit/prisma-extended-models` 包来增强集成。但在验证库集成方面，需要手动实现验证逻辑，不支持主流验证库的自动集成。

### 评分详情

#### 5.1 ORM 集成深度（ORM Integration Depth）

**评分：<-待评分->**

**证据**：
- **支持 Prisma**：官方文档（`docs/pages/docs/integrations/databases.mdx`）推荐使用 Prisma，提供了详细的集成指南
- **支持 Drizzle**：官方示例（`examples/cloudflare-drizzle-d1`）展示了 Drizzle ORM 的集成
- **prisma-extended-models 包**：提供了 `@getcronit/prisma-extended-models` 包来增强 Prisma 集成（`docs/pages/docs/integrations/databases.mdx` 第 51-135 行）
- **需要手动集成**：需要手动创建 Prisma Client 实例，需要手动编写查询逻辑

**实际使用**（`examples/cloudflare-drizzle-d1/src/index.ts`）：
```typescript
import {app, getContext} from '@getcronit/pylon'
import {drizzle} from 'drizzle-orm/d1'

const getDb = () => {
  const ctx = getContext()
  return drizzle(ctx.env.DB, {schema})
}

export const graphql = {
  Query: {
    async users() {
      const db = getDb()
      const users = await db.query.user.findMany()
      return users.map(user => ({
        ...user,
        roles: JSON.parse(user.roles)
      }))
    }
  }
}
```

**Prisma 集成示例**（`docs/pages/docs/integrations/databases.mdx`）：
```typescript
import {app} from '@getcronit/pylon'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

export const graphql = {
  Query: {
    getUser: async (id: number) => {
      return await prisma.user.findUnique({
        where: {id}
      })
    }
  }
}
```

**prisma-extended-models 包**：
- 提供 `bunx prisma-extended-models generate` 命令生成扩展模型
- 自动解析关系和创建可分页连接
- 需要额外安装和配置

**不足之处**：
- ⚠️ **需要手动集成**：需要手动创建 ORM 客户端实例，需要手动编写查询逻辑
- ⚠️ **类型同步需要手动维护**：虽然 Prisma 有类型生成，但需要手动确保类型同步
- ⚠️ **关系解析需要额外配置**：使用 `prisma-extended-models` 需要额外安装和配置

**分析**：
- ✅ 支持主流 ORM（Prisma、Drizzle）
- ✅ 官方提供集成指南和示例
- ✅ 提供 `prisma-extended-models` 包增强集成
- ⚠️ 需要手动集成，不是零样板代码
- ⚠️ 类型同步需要手动维护

**结论**：基础集成。支持通过插件或手动方式集成 ORM，能够复用部分模型定义，但需要较多配置和样板代码。

#### 5.2 验证库集成（Validation Library Integration）

**评分：<-待评分->**

**证据**：
- **无验证库集成**：`packages/pylon/src` 中没有找到 Zod、Valibot、Yup 等验证库的集成
- **需要手动实现验证**：验证通过 `createDecorator` 手动实现（`packages/pylon/src/create-decorator.ts`）
- **验证逻辑与 Schema 定义分离**：验证逻辑需要手动编写，无法从验证规则自动推导类型

**实际使用**（`typescript-graphql-schemas/pylon/src/index.ts`）：
```typescript
// 需要手动实现验证逻辑
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// 使用验证装饰器
createUser: validateEmail((name: string, email: string): User => {
  // 业务逻辑
})
```

**分析**：
- ⚠️ **无验证库集成**：完全不支持主流验证库（Zod、Valibot、Yup 等）
- ⚠️ **验证逻辑与 Schema 定义分离**：验证逻辑需要手动编写，无法从验证规则自动推导类型
- ⚠️ **需要大量样板代码**：每个验证逻辑都需要手动实现，验证代码可能重复

**结论**：无集成。完全不支持验证库集成，必须手动编写所有验证逻辑。

#### 5.3 GraphQL Server 兼容性（Server Compatibility）

**评分：<-待评分->**

**证据**：
- **绑定 GraphQL Yoga**：`packages/pylon/src/app/handler/pylon-handler.ts`（第 8 行）使用 `createYoga` 创建 GraphQL Server
- **无法更换 Server**：核心实现依赖 GraphQL Yoga，无法集成到其他 GraphQL Server（如 Apollo Server）
- **支持 Envelop 插件**：第 152 行支持通过 `config.plugins` 添加 Envelop 插件，但底层仍然是 GraphQL Yoga

**核心实现**（`packages/pylon/src/app/handler/pylon-handler.ts`）：
```typescript
// 第 131-155 行：必须使用 GraphQL Yoga
const yoga = createYoga({
  landingPage: false,
  graphqlEndpoint: '/graphql',
  ...config,
  graphiql: async () => resolveGraphiql(config),
  plugins: [
    useSentry(),
    useDisableIntrospection({ ... }),
    useViewer({ ... }),
    ...(config?.plugins || [])  // 支持 Envelop 插件
  ],
  schema
})
```

**分析**：
- ⚠️ **强制绑定 GraphQL Yoga**：核心实现依赖 GraphQL Yoga，无法更换
- ⚠️ **无法集成到其他 Server**：虽然支持 Envelop 插件，但底层仍然是 GraphQL Yoga
- ✅ **Envelop 插件支持**：支持通过 Envelop 插件扩展功能

**结论**：绑定特定 Server。强制绑定特定 GraphQL Server（GraphQL Yoga），无法集成到其他 Server。

#### 5.4 工具链集成（Toolchain Integration）

**评分：<-待评分->**

##### TypeScript/JavaScript 支持

**TypeScript 支持**：
- **✅ 核心语言**：所有官方模板和示例均使用 TypeScript（`.ts` 文件）
  - `packages/create-pylon/templates/node/default/src/index.ts`
  - `packages/create-pylon/templates/bun/default/src/index.ts`
  - `packages/create-pylon/templates/cf-workers/default/src/index.ts`
  - `packages/create-pylon/templates/deno/default/src/index.ts`
- **✅ TypeScript 配置**：提供官方 TypeScript 配置模板 `tsconfig.pylon.json`
  - `packages/pylon/tsconfig.pylon.json`（第 1-24 行）包含完整的 TypeScript 配置
  - 所有模板项目均继承此配置（`packages/create-pylon/templates/shared/tsconfig.json` 第 2 行）

**JavaScript 支持**：
- **⚠️ 部分支持**：`tsconfig.pylon.json` 中设置 `allowJs: true`（第 13 行），允许在 TypeScript 中导入 JavaScript 文件
- **⚠️ 但无纯 JavaScript 示例**：
  - 所有官方模板和示例均为 TypeScript 文件
  - 构建工具（`pylon-builder`）使用 `esbuild` 的 `loader: 'ts'`（`packages/pylon-builder/src/bundler/bundler.ts` 第 64 行），主要处理 TypeScript
  - 文档和示例中未提供纯 JavaScript 的使用指南

**代码证据**：

`packages/pylon/tsconfig.pylon.json`（第 12-13 行）：
```json
"jsx": "react-jsx", // support JSX
"allowJs": true, // allow importing `.js` from `.ts`
```

`packages/pylon-builder/src/bundler/bundler.ts`（第 63-64 行）：
```typescript
return {
  loader: 'ts',
  contents: contents + `...`
}
```

##### 运行时环境支持

**Node.js**：
- **✅ 明确支持**：提供官方 Node.js 模板和示例
  - `packages/create-pylon/templates/node/default/` 提供完整的 Node.js 模板
  - `examples/nodejs-subscriptions/package.json`（第 13 行）使用 `@hono/node-server` 适配 Node.js
  - `examples/nodejs-subscriptions/package.json`（第 8 行）开发命令：`"dev": "pylon dev -c \"node --enable-source-maps .pylon/index.js\""`

**Bun**：
- **✅ 明确支持**：提供官方 Bun 模板和示例
  - `packages/create-pylon/templates/bun/default/` 提供完整的 Bun 模板
  - `examples/bun-testing/package.json`（第 8 行）开发命令：`"dev": "pylon dev -c 'bun run .pylon/index.js'"`
  - `README.md`（第 171-173 行）明确列出 Bun 作为支持的运行时

**Deno**：
- **✅ 明确支持**：提供官方 Deno 模板
  - `packages/create-pylon/templates/deno/default/` 提供完整的 Deno 模板
  - `packages/create-pylon/templates/deno/default/deno.json`（第 7 行）开发命令：`"dev": "pylon dev -c 'deno run -A .pylon/index.js --config tsconfig.json'"`
  - `packages/create-pylon/templates/deno/default/src/index.ts`（第 12-17 行）使用 `Deno.serve()` 启动服务

**Cloudflare Workers**：
- **✅ 明确支持**：提供官方 Cloudflare Workers 模板和示例
  - `packages/create-pylon/templates/cf-workers/default/` 提供完整的 Cloudflare Workers 模板
  - `examples/cloudflare-drizzle-d1/package.json`（第 6 行）部署命令：`"deploy": "pylon build && wrangler deploy"`
  - `README.md`（第 155 行）明确说明 "Pylon is fully compatible with Cloudflare Workers"

**浏览器**：
- **❌ 不支持**：Pylon 是服务器端 GraphQL 框架，无法在浏览器环境中运行
  - 核心实现依赖 Hono（`packages/pylon/src/app/index.ts` 第 2 行），这是服务器端 Web 框架
  - 依赖 GraphQL Yoga（`packages/pylon/package.json` 第 33 行），这是服务器端 GraphQL Server
  - 所有示例和模板均为服务器端代码，无浏览器运行示例或文档

**代码证据**：

`packages/create-pylon/templates/node/default/src/index.ts`（第 1-15 行）：
```typescript
import {app} from '@getcronit/pylon'
import {serve} from '@hono/node-server'

export const graphql = {
  Query: {
    hello: () => {
      return 'Hello, world!'
    }
  },
  Mutation: {}
}

serve(app, info => {
  console.log(`Server running at ${info.port}`)
})
```

`packages/create-pylon/templates/deno/default/src/index.ts`（第 12-17 行）：
```typescript
Deno.serve(
  {
    port: 3000
  },
  app.fetch
)
```

##### 构建工具支持

**esbuild**：
- **✅ 核心构建工具**：Pylon 的构建系统完全基于 esbuild
  - `packages/pylon-builder/src/bundler/bundler.ts`（第 4 行）导入 `esbuild`
  - `packages/pylon-builder/src/bundler/bundler.ts`（第 94-109 行）使用 `esbuild.build()` 进行构建
  - `packages/pylon-builder/package.json`（第 25 行）依赖 `"esbuild": "^0.23.1"`
  - 用户必须使用 `pylon build` 或 `pylon dev` 命令，这些命令内部使用 esbuild

**Webpack**：
- **⚠️ 无官方配置示例**：
  - 文档和示例中未提供 webpack 配置示例
  - 用户项目无法直接使用 webpack 构建 Pylon 服务器代码
  - 必须使用 `pylon build` 命令生成构建产物，然后可以手动集成到 webpack 工作流中

**Vite**：
- **⚠️ 无官方配置示例**：
  - 文档和示例中未提供 vite 配置示例
  - `examples/cloudflare-pages-worker-monorepo/apps/vite-project/` 中的 vite 项目是客户端项目，不是 Pylon 服务器本身
  - 用户项目无法直接使用 vite 构建 Pylon 服务器代码
  - 必须使用 `pylon build` 命令生成构建产物

**Rspack**：
- **⚠️ 无官方配置示例**：
  - 文档和示例中未提供 rspack 配置示例
  - 无 rspack 相关配置文件或文档
  - 用户项目无法直接使用 rspack 构建 Pylon 服务器代码

**构建流程限制**：
- **⚠️ 必须使用 Pylon CLI**：用户必须使用 `pylon build` 或 `pylon dev` 命令
  - `packages/pylon-dev/src/index.ts`（第 19-37 行）实现 `build` 命令
  - `packages/pylon-dev/src/index.ts`（第 40-278 行）实现 `dev` 命令
  - 这些命令内部调用 `@getcronit/pylon-builder` 进行构建
  - 无法绕过 Pylon CLI 直接使用其他构建工具

**代码证据**：

`packages/pylon-builder/src/bundler/bundler.ts`（第 94-109 行）：
```typescript
const output = await build({
  logLevel: 'silent',
  metafile: true,
  entryPoints: [inputPath],
  outdir: dir,
  bundle: true,
  format: 'esm',
  sourcemap: 'inline',
  packages: 'external',
  plugins: [
    injectCodePlugin,
    esbuildPluginTsc({
      tsconfigPath: path.join(process.cwd(), 'tsconfig.json')
    })
  ]
})
```

`packages/pylon-dev/src/index.ts`（第 19-37 行）：
```typescript
program
  .command('build')
  .description('Build the Pylon Schema')
  .action(async () => {
    consola.start('[Pylon]: Building schema')

    const {totalFiles, totalSize, duration} = await build({
      sfiFilePath: './src/index.ts',
      outputFilePath: './.pylon'
    })
    // ...
  })
```

**分析**：
- ✅ **TypeScript 支持完善**：所有官方模板和示例均使用 TypeScript，提供完整的 TypeScript 配置
- ⚠️ **JavaScript 支持有限**：虽然允许导入 JavaScript 文件，但无纯 JavaScript 示例，构建工具主要处理 TypeScript
- ✅ **多运行时支持良好**：明确支持 Node.js、Bun、Deno、Cloudflare Workers，提供官方模板和示例
- ❌ **浏览器不支持**：Pylon 是服务器端框架，无法在浏览器环境中运行
- ✅ **esbuild 作为核心构建工具**：构建系统完全基于 esbuild
- ⚠️ **其他构建工具支持有限**：无 webpack、vite、rspack 的官方配置示例，用户必须使用 Pylon CLI 进行构建

**结论**：基础支持。主要支持 TypeScript，可在部分主流运行时运行，支持部分构建工具，但需要特定配置，灵活性有限。

### 生态集成综合评分

**得分：1.0**

**评分依据**：
- ORM 集成深度：3.0（基础集成，支持 Prisma 和 Drizzle，但需要手动集成）
- 验证库集成：1.0（无集成，需要手动实现验证逻辑）
- GraphQL Server 兼容性：1.0（绑定 GraphQL Yoga，无法更换）
- 工具链集成：1.0（主要支持 TypeScript，可在部分主流运行时运行，支持部分构建工具，但需要特定配置，灵活性有限，强绑定 Hono）

**优势**：
1. **ORM 支持良好**：官方推荐 Prisma，提供集成指南和 `prisma-extended-models` 包
2. **多运行时支持**：明确支持 Node.js、Bun、Deno、Cloudflare Workers，提供官方模板和示例
3. **Envelop 插件支持**：支持通过 Envelop 插件扩展功能
4. **TypeScript 支持完善**：所有官方模板和示例均使用 TypeScript，提供完整的 TypeScript 配置

**劣势**：
1. **验证库无集成**：完全不支持主流验证库，需要手动实现验证逻辑
2. **框架绑定严重**：强制绑定 Hono 和 GraphQL Yoga，无法更换
3. **ORM 集成需要手动配置**：虽然支持 ORM，但需要手动集成和配置，不是零样板代码
4. **构建工具灵活性有限**：必须使用 Pylon CLI 和 esbuild，无 webpack、vite、rspack 的官方配置示例
5. **浏览器不支持**：Pylon 是服务器端框架，无法在浏览器环境中运行

## 📝 总结

### 综合评分：2.6/5.0

| 维度         | 得分 | 说明                                                         |
| ------------ | ---- | ------------------------------------------------------------ |
| 架构模式     | 2.5  | Inference 模式，必须构建，深度集成 Hono                      |
| 类型定义     | 3.75 | 深度推断，零配置枚举，智能接口检测，强大的类型推断能力       |
| 解析器与验证 | 2.5  | 代码简洁，类型自动推断，但验证和 DataLoader 需手动实现       |
| 内置功能     | 3.1  | Context/Middleware/Subscriptions 完善，DataLoader 无内置支持 |
| 生态集成     | 1.0  | ORM 基础集成，验证库无集成，框架绑定严重                     |

### 整体评价

Pylon 采用 Inference（自动推断）模式，使用 TypeScript Compiler API 静态分析源码，从 TypeScript 类型定义和 Resolver 函数签名自动推断并生成 GraphQL Schema。实现了自动类型推断，零配置枚举，智能接口检测。但必须构建，无法直接运行，深度绑定 Hono 和 GraphQL Yoga，框架灵活性受限。验证库无集成，DataLoader 需手动实现。

### 核心优势

1. **自动类型推断**：从 TypeScript 类型自动生成 GraphQL Schema，减少手动定义
2. **零配置枚举**：字符串联合类型自动转换为 GraphQL 枚举，完全零配置
3. **智能接口检测**：自动检测 Union 类型中的公共字段并生成接口
4. **Context/Middleware/Subscriptions 完善**：原生支持，类型推导完善
5. **多运行时支持**：支持 Node.js、Bun、Deno、Cloudflare Workers

### 主要劣势

1. **必须构建**：无法直接运行，必须先执行构建命令生成 Schema
2. **框架绑定严重**：强制绑定 Hono 和 GraphQL Yoga，无法更换底层框架
3. **无模块化支持**：完全按操作类型组织，容易写出耦合的巨型文件
4. **验证库无集成**：完全不支持主流验证库，需要手动实现验证逻辑
5. **无 DataLoader 支持**：需要手动实现，需要大量样板代码
6. **依赖较多**：运行时依赖包含完整的 GraphQL Server 和 Web 框架

### 适用场景

#### 推荐使用

- 使用 Hono 作为 Web 框架的项目
- 需要自动类型推断的项目
- 需要多运行时部署的项目（Node.js、Bun、Deno、Cloudflare Workers）
- 不介意构建步骤的项目

#### 不推荐使用

- 需要即写即用的项目
- 需要模块化的项目
- 需要验证或 DataLoader 的项目
- 需要更换底层框架的项目
- 需要极简依赖的项目

### 改进建议

1. **提供模块化支持**：支持按领域组织代码，强制模块边界
2. **提供验证和 DataLoader 支持**：减少手动实现，提高开发效率
3. **减少框架绑定**：提高灵活性，支持更换底层框架
4. **支持运行时构建**：提供可选的运行时构建模式，减少构建步骤依赖
