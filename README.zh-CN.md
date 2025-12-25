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
├── pothos/           # Pothos 方案 (Builder 模式，生产环境首选) - 待初始化
├── grats/            # Grats 方案 (Type-as-Schema，黑科技) - 待初始化
├── shared/           # 共享业务模型、Mock 数据及全局自增 ID
├── package.json      # 根目录全局脚本
└── pnpm-workspace.yaml
```

## 📚 GraphQL Schema 库列表

- [ ] **[TypeGraphQL](https://typegraphql.com/)**
- [ ] **[Nexus](https://nexus.js.org/)**
- [x] **[Pothos](https://pothos-graphql.dev/)**
- [ ] **[Grats](https://grats.capt.dev/)**
- [ ] **[Pylon](https://pylon.cronit.io/)**
- [x] **[GQLoom](https://gqloom.dev/)**
- [ ] **[gqtx](https://github.com/sikanhe/gqtx)**
- [ ] **[garph](https://garph.dev/)**

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

| 维度         | **GQLoom**                   | Pothos                | Grats                 |
| :----------- | :--------------------------- | :-------------------- | :-------------------- |
| **定义模式** | 编织 (Weaving)               | 构建器 (Builder)      | 注释 (Type-as-Schema) |
| **Zod 集成** | 深度原生集成                 | 插件支持              | 需手动转换            |
| **ID 处理**  | 精准映射 `z.int()` -> `Int!` | 显式定义              | 自动推断              |
| **代码量**   | 极少 (零重复)                | 较多 (需定义对象映射) | 极少 (无感知)         |
| **学习成本** | 低 (熟悉 Zod 即可)           | 中 (API 较多)         | 低 (需了解 JSDoc)     |

## 📝 许可证
MIT

