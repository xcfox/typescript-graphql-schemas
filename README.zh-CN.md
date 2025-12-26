# TypeScript GraphQL Schema 构建选型对比 (2026)

这是一个用于横向对比 2026 年主流 TypeScript GraphQL Schema 构建库的示例项目。我们通过实现一个相同的业务场景——**“极简在线咖啡点餐系统”**，来评估不同工具的开发效率（DX）、类型安全性和样板代码量。

## 🚀 技术栈 (2026 标准版)

- **Runtime**: Node.js v24+ (原生支持 TypeScript `experimental-strip-types`)
- **Package Manager**: pnpm Workspaces
- **GraphQL Server**: GraphQL Yoga
- **Type Validation**: Zod v4.2.1
- **Monorepo 管理**: pnpm

## 📂 项目结构

```text
/typescript-graphql-schemas
├── gqloom/           # GQLoom 方案 (Weaving 模式，极致 DX)
├── pothos/           # Pothos 方案 (Builder 模式，生产环境首选)
├── grats/            # Grats 方案 (Type-as-Schema，黑科技)
├── shared/           # 共享业务模型、Mock 数据及全局自增 ID
├── package.json      # 根目录全局脚本
└── pnpm-workspace.yaml
```

## 📚 GraphQL Schema 库列表

- [x] **[TypeGraphQL](https://typegraphql.com/)**
- [x] **[Nexus](https://nexusjs.org/)**
- [x] **[Pothos](https://pothos-graphql.dev/)**
- [x] **[Grats](https://grats.capt.dev/)**
- [x] **[gqtx](https://github.com/sikanhe/gqtx)**
- [x] **[GQLoom](https://gqloom.dev/)**
- [ ] **[Pylon](https://pylon.cronit.io/)**
- [x] **[garph](https://garph.dev/)**

## ☕ 业务模型：咖啡点餐系统

每个库都必须实现以下核心领域模型和逻辑：

- **User**: 用户信息（id, name, email）。
- **MenuItem**: 菜单项（id, name, price, category: COFFEE | FOOD）。
- **Order**: 订单（id, createdAt, status, userId, itemIds）。
- **关联查询**:
  - `User.orders`: 获取用户的所有订单。
  - `Order.user`: 获取订单的下单人信息。
  - `Order.items`: 获取订单内的商品详情。
- **业务验证**:
  - 下单时校验 `userId` 和 `itemIds` 必须在内存数据库中存在。

## 🛠️ 快速开始

### 安装依赖
```bash
pnpm install
```

### 运行 GQLoom 示例
```bash
# 启动开发服务器 (支持热重载)
pnpm dev:gqloom

# 仅打印并生成 schema.graphql
pnpm print:gqloom
```

## 📊 选型观察 (持续更新)

| 维度            | **GQLoom**                            | **Pothos**                          | **TypeGraphQL**                                            |
| :-------------- | :------------------------------------ | :---------------------------------- | :--------------------------------------------------------- |
| **架构模式**    | 编织 (Weaving) - 组合式，无运行时开销 | 构建器 (Builder) - 配置式，灵活     | 装饰器 (Decorator) - 类基础，需元数据                      |
| **类型定义**    | Zod Schema - 单一数据源，类型+验证    | Builder API - 显式定义，灵活        | 类装饰器 - 直观但需装饰器                                  |
| **依赖复杂度**  | 最小化 (`@gqloom/core` + `zod`)       | 中等 (核心+插件+`dataloader`+`zod`) | 较高 (`type-graphql`+`reflect-metadata`+`class-validator`) |
| **验证系统**    | Zod 原生 - 直接使用 `z.email()`       | Zod 插件 - 需配置 `validate`        | class-validator - 装饰器验证                               |
| **批处理集成**  | 内置 `.load()` - API 直观             | `loadableGroup` - 功能完整          | 手动 DataLoader - 需自行管理                               |
| **枚举处理**    | `z.enum()` - 最简洁                   | `builder.enumType()` - 需对象定义   | `registerEnumType()` - 需注册步骤                          |
| **参数定义**    | 链式 API - `.input().resolve()`       | 配置对象 - `args: { ... }`          | 装饰器参数 - `@Arg()` 或 `@ArgsType()`                     |
| **自定义验证**  | Zod `.refine()` - 简洁直观            | Zod `.refine()` - 需配置            | 自定义装饰器 - 代码量大                                    |
| **Schema 构建** | `weave()` - 组合式，配置集中          | `builder.toSchema()` - 最简单       | `buildSchema()` - 需配置验证函数                           |
| **代码量**      | 极少 (零重复)                         | 较多 (需定义对象映射)               | 中等 (类定义+装饰器)                                       |
| **学习成本**    | 低 (熟悉 Zod 即可)                    | 中 (API 较多)                       | 中 (需了解装饰器+class-validator)                          |

## 📝 许可证
MIT

