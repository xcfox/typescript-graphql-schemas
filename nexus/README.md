# Nexus Evaluation Report (January 2026)

> This report is generated based on [example business code](https://github.com/xcfox/typescript-graphql-schemas/tree/main/nexus/src) and [official examples](https://github.com/graphql-nexus/nexus/tree/main/examples).

## 📋 Basic Information
| Project             | Content                                |
| :------------------ | :------------------------------------- |
| **Current Version** | 1.3.0                                  |
| **GitHub**          | https://github.com/graphql-nexus/nexus |
| **Documentation**   | https://nexusjs.org/                   |
| **First Commit**    | 2018-11-02                             |
| **Last Commit**     | 2023-03-16                             |

## 📊 Overall Score
| Dimension                     | Score (1-5)      | Brief Comment                                                                                            |
| :---------------------------- | :--------------- | :------------------------------------------------------------------------------------------------------- |
| **1. Architecture**           | **4.0**          | Builder pattern + code generation, minimal configuration, fully neutral                                  |
| **2. Type Definition**        | **3.0**          | Builder API + code generation, more explicit declarations, good type safety                              |
| **3. Resolvers & Validation** | <-To be scored-> | Excellent modularity, good type safety, but validation and DataLoader require manual implementation      |
| **4. Built-in Features**      | **3.2**          | Core features complete, advanced features via plugins, DataLoader and depth limiting not supported       |
| **5. Ecosystem Integration**  | **3.5**          | Excellent GraphQL Server and Web framework compatibility, limited ORM and validation library integration |

---

## 1. Architecture Pattern (Architecture)

### Architecture Overview

Nexus uses the **Builder pattern** to build GraphQL Schema. Developers define types and fields through functional APIs (such as `objectType`, `queryField`, `mutationField`), and then convert the definitions into executable GraphQL Schema through `makeSchema()`. Nexus uses code generation (Typegen) to provide type safety by analyzing Schema definitions to generate TypeScript type definition files.

**Core Implementation Locations**:
- `src/builder.ts`: `SchemaBuilder` class, responsible for type registration, building, and resolution
- `src/makeSchema.ts`: `makeSchema()` function, Schema building entry point
- `src/typegenMetadata.ts`: Code generation metadata management
- `src/typegenAutoConfig.ts`: Automatic type inference configuration
- `src/plugin.ts`: Plugin system implementation

### 1.1 Dependency Complexity (Dependency Complexity)

**Score: 5.0**

**Core Dependency Analysis**:
- **Runtime Dependencies** (lines 70-72 of `package.json`):
  - `iterall: ^1.3.0` - Iterator utility library (for handling GraphQL iterators)
  - `tslib: ^2.0.3` - TypeScript runtime library (for helper functions)
- **Peer Dependency** (lines 103-105 of `package.json`):
  - `graphql: 15.x || 16.x` - GraphQL standard library
- **No Decorator Dependencies**: Does not require `reflect-metadata` or decorator support
- **No Reflection Library**: Does not depend on runtime reflection mechanisms

**Evidence**:
```json
// nexus/package.json
"dependencies": {
  "iterall": "^1.3.0",
  "tslib": "^2.0.3"
},
"peerDependencies": {
  "graphql": "15.x || 16.x"
}
```

**Analysis**:
- ✅ Only 2 runtime dependencies, lighter than decorator pattern (requires `reflect-metadata`, `class-validator`, etc.)
- ✅ Core dependencies are only the `graphql` standard library and two lightweight helper libraries
- ✅ `iterall` and `tslib` are both very small utility libraries that don't significantly increase package size
- ✅ Completely no need for decorators, reflection metadata, and other "magic" dependencies

**Actual Usage** (`typescript-graphql-schemas/nexus/package.json`):
- Business code only needs to install `nexus` and `graphql` as dependencies
- Runtime dependencies are minimal with no additional burden

**Conclusion**: Minimal dependencies. Only depends on the `graphql` standard library and two lightweight helper libraries, zero runtime overhead, no additional third-party dependencies.

### 1.2 Build Flow (Build Flow)

**Score: 3.5**

**Build Methods**:
- **Runtime Build**: `makeSchema()` builds GraphQL Schema at runtime (`src/makeSchema.ts:21-58`)
- **Code Generation (Typegen)**: Optional, used to generate TypeScript type definition files (`src/typegenMetadata.ts:29-48`)
- **Default Behavior**: Automatically generates type files in development, can be disabled in production (`src/builder.ts:296-301`)

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema.ts
export const schema = makeSchema({
  types: { DateTime, Query, Mutation, ...allTypes },
  outputs: {
    schema: join(__dirname, '../schema.graphql'),  // Optional: generate SDL
    typegen: join(__dirname, './nexus-typegen.d.ts'),  // Optional: generate types
  },
  contextType: { module: join(__dirname, './context.ts'), export: 'Context' },
  sourceTypes: { modules: [{ module: '@coffee-shop/shared', alias: 'shared' }] },
})
```

**Code Generation Mechanism**:
- **Generation Timing**: Asynchronously generated when `makeSchema()` is called (`src/makeSchema.ts:26-54`)
- **Generated Content**:
  - TypeScript type definition file (`nexus-typegen.d.ts`): Contains TypeScript types for all GraphQL types
  - GraphQL SDL file (`schema.graphql`): Optional, for viewing or reviewing Schema
- **Type Inference**: Automatically infers types from TypeScript source code through `sourceTypes` configuration (`src/typegenAutoConfig.ts:92-203`)

**Core Implementation**:
```typescript
// src/makeSchema.ts:26-54
if (sdl || typegen) {
  const typegenPromise = new TypegenMetadata(typegenConfig).generateArtifacts(schema)
  if (config.shouldExitAfterGenerateArtifacts) {
    typegenPromise.then(() => {
      console.log(`Generated Artifacts:
      TypeScript Types  ==> ${typegenPath}
      GraphQL Schema    ==> ${typegenConfig.outputs.schema || '(not enabled)'}`)
      process.exit(0)
    })
  }
}
```

**Shortcomings**:
- ⚠️ Although Schema can be built at runtime, code generation is usually required to get complete type safety
- ⚠️ Need to wait for type generation to complete on first run or after Schema changes, may affect development experience
- ⚠️ Type generation is asynchronous, may need to handle generation delays in development environments

**Conclusion**: Lightweight build. Supports runtime building, but usually recommended to use with type generation step for best TypeScript experience. Code generation is optional but strongly recommended.

### 1.3 Config & Language Magic (Config & Language Magic)

**Score: 4.0**

**Technical Implementation**:
- **No Decorators**: Define types through Builder API, completely functional
- **No Reflection Metadata**: Does not depend on `reflect-metadata` or runtime reflection
- **Type Inference**: Provides type safety through TypeScript's type system and code generation

**Core Implementation Evidence**:
```typescript
// src/builder.ts:459-1878
export class SchemaBuilder {
  private pendingTypeMap: Record<string, AllNexusNamedTypeDefs | null> = {}
  private finalTypeMap: Record<string, GraphQLNamedType> = {}
  
  addType(typeDef: NexusAcceptedTypeDef) {
    // Directly register type definition, no reflection needed
    this.pendingTypeMap[typeDef.name] = typeDef
  }
}
```

**Actual Usage**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.string('email')
    // Completely functional API, no decorators
  },
})
```

**Type Safety Mechanism**:
- **Code Generation**: Generates TypeScript types by analyzing Schema definitions (`src/typegenPrinter.ts`)
- **Type Inference**: Infers types from TypeScript source code through `sourceTypes` configuration (`src/typegenAutoConfig.ts`)
- **Global Type Extension**: Extends global types through generated type files (`src/nexus-typegen.d.ts`)

**Actual Usage Evidence**:
```typescript
// Almost all official examples configure typegen
export const schema = makeSchema({
  types: allTypes,
  outputs: {
    schema: path.join(__dirname, '../schema.graphql'),
    typegen: path.join(__dirname, './nexus-typegen.d.ts'),  // Strongly recommended
  },
})

// Generated type file (nexus-typegen.d.ts)
declare global {
  interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenObjects {
  User: {
    id: number
    name: string
    email: string
  }
}
```

**Official Example Statistics**:
- `apollo-fullstack/src/index.ts`: Configured `typegen`
- `githunt-api/src/index.js`: Configured `typegen`
- `kitchen-sink/src/index.ts`: Configured detailed `typegen` options
- `star-wars/src/schema.ts`: Configured `typegen`
- `ghost/src/ghost-schema.ts`: Configured `typegen`
- `with-prisma/api.ts`: Configured `typegen`
- `ts-ast-reader/src/schema.ts`: Configured `typegen`
- `typescript-graphql-schemas/nexus/src/schema.ts`: Configured `typegen`
- Only `zeit-typescript/schema/index.ts` not configured (minimal example)

**Analysis**:
- ✅ No decorators and reflection metadata, conforms to native TypeScript practices
- ✅ Uses standard TypeScript syntax, no experimental features
- ⚠️ **Code generation is optional but almost required in practice**: Almost all official examples configure `typegen`, strongly recommended for complete type safety
- ⚠️ **Code generation requires additional configuration**: Need to configure `outputs.typegen` path, increases configuration complexity
- ⚠️ **Generated type files need maintenance**: Generated `.d.ts` files need to be version controlled, synchronization issues exist
- ⚠️ **Does not fully conform to "fully native TS best practices"**: Native TypeScript does not require code generation steps

**Conclusion**: Minimal configuration. Although no decorators and reflection metadata are used, code generation is optional but almost required in practice for complete type safety, requires additional configuration and maintenance of generated type files, does not fully conform to "fully native TS best practices" standards.

### 1.4 Ecosystem Integration (Ecosystem Integration)

**Score: 5.0**

**Integration Methods**:
- **Standard npm Installation**: Can be used through `npm install nexus`
- **Plugin System**: Supports feature extension through `plugin()` API (`src/plugin.ts:209-212`)
- **Web Framework Compatibility**: Compatible with all mainstream GraphQL Servers (Apollo Server, GraphQL Yoga, Envelop, etc.)

**Official Examples** (`examples/` directory):
- `apollo-fullstack`: Apollo Server integration example
- `with-prisma`: Prisma ORM integration example
- `kitchen-sink`: Complete feature demonstration
- `star-wars`: Basic usage example

**Plugin Ecosystem**:
- **Built-in Plugins** (`src/plugins/` directory):
  - `connectionPlugin`: Relay Connection pattern support
  - `fieldAuthorizePlugin`: Field authorization plugin
  - `queryComplexityPlugin`: Query complexity analysis
  - `nullabilityGuardPlugin`: Null value protection
- **Community Plugins**: Supports creating custom plugins through `plugin()` API

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema.ts
export const schema = makeSchema({
  types: { DateTime, Query, Mutation, ...allTypes },
  // Standard configuration, no special framework binding needed
  outputs: { schema: '...', typegen: '...' },
  contextType: { module: '...', export: 'Context' },
})
```

**GraphQL Server Integration**:
```typescript
// Can integrate with any GraphQL Server
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'
const yoga = createYoga({ schema })
```

**Conclusion**: Fully neutral. Supports standard `npm install`, can freely combine with any Web framework and build tools. Achieves flexible ecosystem integration through plugin system.

### Architecture Summary

| Evaluation Item             | Score   | Description                                                                                           |
| :-------------------------- | :------ | :---------------------------------------------------------------------------------------------------- |
| **Dependency Complexity**   | **5.0** | Only depends on `graphql` standard library and two lightweight helper libraries                       |
| **Build Flow**              | **3.5** | Runtime build + optional code generation, recommended to use type generation                          |
| **Config & Language Magic** | **4.0** | Minimal configuration, no decorators or reflection metadata, but strongly recommended code generation |
| **Ecosystem Integration**   | **5.0** | Fully neutral, standard npm installation, supports multiple frameworks                                |

**Overall Score: 4.0**

Nexus's architecture design embodies the "Builder pattern + code generation" philosophy: defines Schema through functional Builder API, provides type safety through code generation, completely avoids decorators and runtime reflection, achieving a lightweight, type-safe GraphQL Schema building solution. Although code generation is technically optional, it's almost required in practice for complete type safety, requires additional configuration and maintenance of generated type files, does not fully conform to "fully native TS best practices" standards.

## 2. Type Definition (Type Definition)

### Type Definition Overview

Nexus uses **Builder API + code generation** to define GraphQL types. Developers define types through functional APIs (such as `objectType`, `interfaceType`, `unionType`, `enumType`), then build Schema through `makeSchema()` and generate TypeScript type definition files. Type safety is achieved through code generation, not runtime reflection.

**Core Implementation Locations**:
- `src/definitions/objectType.ts`: Object type definition
- `src/definitions/interfaceType.ts`: Interface type definition
- `src/definitions/unionType.ts`: Union type definition
- `src/definitions/enumType.ts`: Enum type definition
- `src/typegenPrinter.ts`: Type generator
- `src/typegenAutoConfig.ts`: Automatic type inference configuration

### 2.1 Single Source of Truth (Single Source of Truth) Implementation

**Score: 3.0**

**Implementation Method**:
- **Nexus Definition as Schema Data Source**: Types defined through Builder API are directly converted to GraphQL Schema
- **TypeScript Types via Code Generation**: Generates TypeScript type files by analyzing Schema definitions (`nexus-typegen.d.ts`)
- **Source Types Support**: Can infer types from TypeScript source code through `sourceTypes` configuration (`src/typegenAutoConfig.ts:92-203`)

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.string('email')
  },
})

// Generated type file (nexus-typegen.d.ts)
export interface NexusGenObjects {
  User: {
    id: number
    name: string
    email: string
  }
}
```

**Source Types Mechanism**:
```typescript
// typescript-graphql-schemas/nexus/src/schema.ts
export const schema = makeSchema({
  sourceTypes: {
    modules: [
      {
        module: '@coffee-shop/shared',
        alias: 'shared',
      },
    ],
  },
})
```

**Analysis**:
- ✅ Nexus definition is the single source of truth for GraphQL Schema
- ✅ TypeScript types are automatically synchronized through code generation
- ⚠️ Need to run code generation to get type safety, synchronization delay exists
- ⚠️ Source Types is mainly used for type mapping inference, not as Schema definition source
- ⚠️ Type definitions and TypeScript types are separated, need manual consistency maintenance

**Shortcomings**:
- Need to run code generation to update type definitions
- Type definitions and TypeScript types are physically separated (definitions in `.ts` files, types in `.d.ts` files)
- Source Types is mainly used for type mapping, cannot completely replace manual definitions

**Conclusion**: Logical association. Nexus type definitions are bound to TypeScript types through code generation, although there's some duplication, the type chain can be maintained. Need to run build command to update types.

### 2.2 Enum & String Union Support (Enum & String Union Types)

**Score: 3.0**

**Implementation Method**:
- **Explicit Enum Registration**: Manually register enum types through `enumType()` API (`src/definitions/enumType.ts:86-88`)
- **Support Multiple Definition Methods**: Supports string arrays, objects, TypeScript enums (`src/definitions/enumType.ts:44-47`)
- **Type Safety**: Generated type definitions include enum values (`nexus-typegen.d.ts:34-37`)

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/menu.ts
export const SugarLevel = enumType({
  name: 'SugarLevel',
  members: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
})

// typescript-graphql-schemas/nexus/src/schema/order.ts
export const OrderStatus = enumType({
  name: 'OrderStatus',
  members: ['PENDING', 'COMPLETED'],
})
```

**Generated Types**:
```typescript
// nexus-typegen.d.ts
export interface NexusGenEnums {
  OrderStatus: "COMPLETED" | "PENDING"
  SugarLevel: "HIGH" | "LOW" | "MEDIUM" | "NONE"
}
```

**TypeScript Enum Support** (`src/definitions/enumType.ts:1223-1237`):
```typescript
// Supports TypeScript enums
enum MyEnum {
  VALUE1 = 'value1',
  VALUE2 = 'value2',
}

export const MyGraphQLEnum = enumType({
  name: 'MyGraphQLEnum',
  members: MyEnum, // Directly use TypeScript enum
})
```

**Analysis**:
- ✅ Supports multiple enum definition methods (string arrays, objects, TypeScript enums)
- ✅ Generated type definitions include enum values, type safe
- ⚠️ Need to explicitly call `enumType()` to register, cannot directly use TypeScript enums
- ⚠️ String union types need to be manually converted to enum definitions

**Shortcomings**:
- Cannot directly use TypeScript string union types (like `'A' | 'B'`), need manual registration
- Need to explicitly call API to register enums, cannot reuse with zero configuration

**Conclusion**: Explicit registration. Need to call `enumType()` to manually register, but can maintain type safety in inference. Supports multiple definition methods, but requires explicit declarations.

### 2.3 Interface Inheritance & Union Type Experience (Interface & Union)

**Score: 3.0**

**Implementation Method**:
- **Interface Definition**: Define interfaces through `interfaceType()` (`src/definitions/interfaceType.ts:158-160`)
- **Interface Implementation**: Implement interfaces through `t.implements()` (`src/definitions/objectType.ts:18-19`)
- **Automatic Field Inheritance**: Object types implementing interfaces automatically inherit interface fields (`src/builder.ts:1368-1422`)
- **Union Types**: Define union types through `unionType()` (`src/definitions/unionType.ts:120-122`)
- **Type Resolution**: Need to manually implement `resolveType` function (`src/definitions/interfaceType.ts:29-31`)

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/menu.ts

// Interface: Food (common fields)
export const Food = interfaceType({
  name: 'Food',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.float('price')
  },
  resolveType(item: any) {
    return item?.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})

// Coffee type, implements Food interface
export const Coffee = objectType({
  name: 'Coffee',
  definition(t) {
    t.implements('Food')  // Implement interface
    t.nonNull.field('sugarLevel', { type: SugarLevel })
    t.nonNull.string('origin')
  },
})

// Union type: MenuItem = Coffee | Dessert
export const MenuItem = unionType({
  name: 'MenuItem',
  definition(t) {
    t.members('Coffee', 'Dessert')
  },
  resolveType(item: any) {
    return item?.__typename === 'Coffee' ? 'Coffee' : 'Dessert'
  },
})
```

**Generated Types**:
```typescript
// nexus-typegen.d.ts
export interface NexusGenInterfaces {
  Food: NexusGenRootTypes['Coffee'] | NexusGenRootTypes['Dessert'];
}

export interface NexusGenUnions {
  MenuItem: NexusGenRootTypes['Coffee'] | NexusGenRootTypes['Dessert'];
}

export interface NexusGenTypeInterfaces {
  Coffee: "Food"
  Dessert: "Food"
}
```

**Field Inheritance Mechanism** (`src/builder.ts:1368-1422`):
- Interface fields are automatically merged into implementing types
- Supports field modification (`t.modify()`) to override interface field definitions
- Supports adding additional parameters to interface fields

**Analysis**:
- ✅ Interface fields automatically inherited, no need to repeat declarations
- ✅ Supports field modification and extension
- ✅ Generated type definitions correctly reflect interfaces and union types
- ⚠️ Need to manually implement `resolveType` function, cannot automatically handle `__typename`
- ⚠️ Union types need to manually return type names

**Shortcomings**:
- Need to manually implement `resolveType` function, cannot automatically handle `__typename` field
- Does not support automatic type resolution, need to manually determine types based on data structure
- Although supports `__typename` strategy (`src/typegenAbstractTypes.ts:395-405`), requires explicit configuration

**Conclusion**: Logical resolution. Supports abstract types, but requires manual implementation of `resolveType` function, and has specific dependencies on original data structure (requires `__typename` field).

### 2.4 Type Inference Strength & Explicit Declaration Balance

**Score: 3.0**

**Implementation Method**:
- **Basic Type Inference**: Builder API can automatically infer basic types (`t.int()`, `t.string()`, etc.)
- **Array Types**: Need to explicitly use `list()` and `nonNull()` (`src/definitions/list.ts`)
- **Type References**: Supports string references (`type: 'User'`) and object references (`type: User`)
- **Code Generation Enhancement**: Provides type safety through generated type files

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')  // Basic types can be inferred
    t.nonNull.string('name')
    t.nonNull.string('email')
    t.nonNull.list.nonNull.field('orders', {  // Arrays need explicit declaration
      type: Order,  // Type reference
      resolve(parent) {
        return Array.from(orderMap.values()).filter((order) => order.userId === parent.id)
      },
    })
  },
})
```

**Type Inference Capabilities**:
- ✅ Basic types (`int`, `string`, `float`, `boolean`) can be inferred
- ✅ Scalar types can be referenced via strings (`type: 'DateTime'`)
- ⚠️ Array types need to explicitly use `list()` and `nonNull()`
- ⚠️ Optional types need to explicitly use `nullable()` or omit `nonNull()`
- ⚠️ Type references need to be explicitly specified (string or object)

**Code Generation Type Safety**:
```typescript
// Generated types provide complete type safety
export interface NexusGenFieldTypes {
  User: {
    id: number
    name: string
    email: string
    orders: NexusGenRootTypes['Order'][]
  }
}

export interface NexusGenArgTypes {
  Mutation: {
    createUser: {
      name: string
      email: string
    }
  }
}
```

**Analysis**:
- ✅ Basic types can be inferred, API is concise
- ✅ Generated type files provide complete type safety
- ⚠️ Arrays, Promises, and lazy-loaded types frequently need explicit annotations
- ⚠️ Type references need to be explicitly specified, cannot be completely automatically inferred
- ⚠️ Optional types need manual handling, cannot be automatically inferred

**Shortcomings**:
- Array types need to explicitly use `list()` and `nonNull()`, cannot be automatically inferred
- Type references need to be explicitly specified, cannot be automatically inferred from context
- Optional types need manual handling, cannot be automatically inferred

**Conclusion**: Annotation as needed. Basic types can be inferred, but arrays, Promises, and lazy-loaded types frequently need `list()`, `nonNull()` and other syntax. Type references need to be explicitly specified.

### Type Definition Summary

| Evaluation Item                                   | Score   | Description                                                                              |
| :------------------------------------------------ | :------ | :--------------------------------------------------------------------------------------- |
| **Single Source of Truth (SSOT)**                 | **3.0** | Nexus definition as Schema source, TypeScript types synchronized through code generation |
| **Enum & String Union Support**                   | **3.0** | Explicit registration, supports multiple definition methods, type safe                   |
| **Interface Inheritance & Union Type Experience** | **3.0** | Fields automatically inherited, but need to manually implement `resolveType`             |
| **Type Inference Strength**                       | **3.0** | Basic types can be inferred, but arrays and optional types need explicit annotations     |

**Overall Score: 3.0**

Nexus's type definition uses Builder API + code generation pattern, provides good type safety, but requires more explicit declarations of details. Interface inheritance and automatic field inheritance work well, but union types need manual type resolution implementation. Type inference performs well on basic types, but complex types (arrays, optional types) need explicit annotations.

## 3. Resolvers & Validation (Resolvers & Validation)

### Resolvers & Validation Overview

Nexus defines resolvers through Builder API, supports modular organization through `extendType()`. Resolver functions receive standard GraphQL parameters (`parent`, `args`, `context`, `info`), types provide type safety through code generation. Input validation needs to be manually implemented, usually using validation libraries like Zod.

**Core Implementation Locations**:
- `src/definitions/extendType.ts`: Type extension API, for modular organization
- `src/definitions/queryField.ts`: Query field definition
- `src/definitions/mutationField.ts`: Mutation field definition
- `src/definitions/args.ts`: Argument definition API
- `src/definitions/definitionBlocks.ts`: Field definition blocks

### 3.1 Developer Experience (Code Conciseness)

**Score: 4.0**

**Implementation Method**:
- **Builder API**: Define fields and resolvers through `extendType()` and `t.field()`
- **Type Safety**: Provides complete type safety through code generation
- **Code Organization**: Supports organizing code by domain modules

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const UserQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('users', {
      type: User,
      resolve() {
        return Array.from(userMap.values())
      },
    })

    t.nonNull.field('user', {
      type: User,
      args: {
        id: nonNull(intArg()),
      },
      resolve(_parent, { id }) {
        const user = userMap.get(id)
        if (!user) {
          throw new GraphQLError('User not found')
        }
        return user
      },
    })
  },
})
```

**Field Resolver**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('name')
    t.nonNull.string('email')
    t.nonNull.list.nonNull.field('orders', {
      type: Order,
      resolve(parent) {
        return Array.from(orderMap.values()).filter((order) => order.userId === parent.id)
      },
    })
  },
})
```

**Analysis**:
- ✅ Code structure is clear, Builder API is intuitive
- ✅ Type safety provided through code generation, good IDE hints
- ⚠️ Need to explicitly declare field types, parameter types, etc., moderate code amount
- ⚠️ Need to manually handle errors and validation logic

**Shortcomings**:
- Need to explicitly declare field configuration objects, cannot completely chain calls
- Error handling needs manual implementation, cannot be automatically handled

**Conclusion**: Code is concise, template code amount is moderate, requires minimal configuration, code structure is clear.

### 3.2 Modular Design (Domain-Driven Development Support)

**Score: <-To be scored->**

**Implementation Method**:
- **extendType API**: Supports organizing code by domain modules through `extendType()` (`src/definitions/extendType.ts:91-93`)
- **Domain Modularity**: Each domain module can independently define types, Query, Mutation, and Field Resolver
- **Automatic Merging**: Automatically merges all modules through `makeSchema()`

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
export const User = objectType({ /* ... */ })
export const UserQuery = extendType({ type: 'Query', definition(t) { /* ... */ } })
export const UserMutation = extendType({ type: 'Mutation', definition(t) { /* ... */ } })

// typescript-graphql-schemas/nexus/src/schema/menu.ts
export const Food = interfaceType({ /* ... */ })
export const Coffee = objectType({ /* ... */ })
export const MenuQuery = extendType({ type: 'Query', definition(t) { /* ... */ } })
export const MenuMutation = extendType({ type: 'Mutation', definition(t) { /* ... */ } })

// typescript-graphql-schemas/nexus/src/schema.ts
import * as allTypes from './schema/index.ts'
export const schema = makeSchema({
  types: { DateTime, Query, Mutation, ...allTypes },
})
```

**Module Organization**:
- ✅ Each domain module (User, Menu, Order) is in a separate file
- ✅ Type definitions, Query, Mutation, Field Resolver are all in the same module
- ✅ Creates clear module boundaries through `extendType()`
- ✅ Automatic merging, no manual management needed

**Analysis**:
- ✅ Supports domain modularity, can organize code by domain
- ✅ Type definitions, Query, Mutation, Field Resolver are all in the same module
- ⚠️ Query and Mutation are separated (`UserQuery` and `UserMutation` are two independent `extendType`), not unified object or class boundaries
- ⚠️ Need to manually export all modules (`schema/index.ts`), not mandatory
- ✅ Supports cross-module references (e.g., `Order` references `User` and `MenuItem`)

**Shortcomings**:
- Query and Mutation are separated, not unified object/class boundaries, module boundaries are not unified enough
- Need to manually export modules, not mandatory

**Conclusion**: Supports domain modularity, provides modular API, can split files by domain, but Query and Mutation are separated, need manual export, requires developers to consciously follow modular principles.

### 3.3 Argument Definition & Type Inference

**Score: 4.0**

**Implementation Method**:
- **Argument Definition API**: Define arguments through helper functions like `intArg()`, `stringArg()`, `floatArg()` (`src/definitions/args.ts:137-327`)
- **Type Inference**: Provides argument types through code generation (`nexus-typegen.d.ts:204-268`)
- **Optional Arguments**: Define optional arguments by omitting `nonNull()` or using `nullable()`

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
t.nonNull.field('createUser', {
  type: User,
  args: {
    name: nonNull(stringArg()),  // Required argument
    email: nonNull(stringArg()),
  },
  resolve(_parent, { name, email }) {
    // name and email types are automatically inferred as string
  },
})

t.nonNull.field('updateUser', {
  type: User,
  args: {
    id: nonNull(intArg()),
    name: stringArg(),  // Optional argument
    email: stringArg(),
  },
  resolve(_parent, { id, name, email }) {
    // name and email types are automatically inferred as string | null | undefined
  },
})
```

**Generated Types**:
```typescript
// nexus-typegen.d.ts
export interface NexusGenArgTypes {
  Mutation: {
    createUser: {
      email: string
      name: string
    }
    updateUser: {
      email?: string | null
      id: number
      name?: string | null
    }
  }
}
```

**Complex Arguments**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/order.ts
t.nonNull.field('createOrder', {
  type: Order,
  args: {
    userId: nonNull(intArg()),
    items: nonNull(list(nonNull(intArg()))),  // Array argument
  },
  resolve(_parent, { userId, items }) {
    // items type is automatically inferred as number[]
  },
})
```

**Analysis**:
- ✅ Argument types are mostly automatically inferred, provides type safety through code generation
- ✅ Supports required and optional arguments, types are correct
- ✅ Supports array arguments and nested types
- ⚠️ Need to explicitly use `nonNull()` or `nullable()` to declare nullability
- ⚠️ Complex types need explicit declaration

**Shortcomings**:
- Need to explicitly declare argument types, cannot be completely automatically inferred
- Nullability needs manual handling, cannot be automatically inferred

**Conclusion**: Argument types are mostly automatically inferred, few need explicit declaration. Automatically inferred through Builder API or type inference tools, requires minimal type annotations.

### 3.4 Input Validation Mechanism

**Score: 3.0**

**Implementation Method**:
- **No Built-in Validation**: Nexus does not provide built-in validation functionality
- **Manual Validation**: Need to manually call validation functions in Resolver
- **Validation Library Integration**: Usually uses validation libraries like Zod (`src/utils/validate.ts`)

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/utils/validate.ts
import { GraphQLError } from 'graphql'
import { z } from 'zod'

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issues = result.error.issues || []
    const firstError = issues[0]
    const errorMessage = firstError?.message || 'Validation failed'
    throw new GraphQLError(errorMessage)
  }
  return result.data
}
```

**Validation Usage**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
t.nonNull.field('createUser', {
  type: User,
  args: {
    name: nonNull(stringArg()),
    email: nonNull(stringArg()),
  },
  resolve(_parent, { name, email }) {
    // Manually call validation function
    parse(z.string().email(), email)

    const id = incrementId()
    const newUser = { id, name, email }
    userMap.set(id, newUser)
    return newUser
  },
})
```

**Complex Validation**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/order.ts
resolve(_parent, { userId, items }) {
  // Validate userId exists
  if (!userMap.has(userId)) {
    throw new GraphQLError('User not found')
  }

  // Validate items exist and array is not empty
  const itemsSchema = z
    .array(z.number().refine((id) => menuMap.has(id), 'Menu item not found'))
    .min(1, 'At least one item is required')

  parse(itemsSchema, items)
  // ...
}
```

**Analysis**:
- ⚠️ No built-in validation, need manual implementation
- ⚠️ Validation logic and business logic are mixed
- ⚠️ Need to manually call validation functions, code duplication
- ✅ Can use validation libraries like Zod, powerful functionality
- ⚠️ Validation logic is separated from Schema definition

**Shortcomings**:
- No built-in validation support, need complete manual implementation
- Validation code and business logic are mixed, code duplication
- Validation logic is separated from Schema definition, need manual consistency maintenance

**Conclusion**: Supports validation, but requires manual validation logic writing. Need to manually call validation functions, validation code and business logic are mixed.

### 3.5 Batch Loading (DataLoader) Integration

**Score: 0.0**

**Implementation Method**:
- **No Built-in Support**: Nexus does not provide built-in DataLoader support
- **Manual Implementation**: Need to manually create DataLoader instances, define Context type, configure Context injection

**Actual Usage**:
```typescript
// typescript-graphql-schemas/nexus/src/context.ts
export interface Context {
  // Add context properties here if needed
  // Need to manually add DataLoader instances
}
```

**Analysis**:
- ⚠️ No built-in DataLoader support provided
- ⚠️ Need to manually create DataLoader instances
- ⚠️ Need to manually define Context type
- ⚠️ Need to manually configure Context injection
- ⚠️ Lots of boilerplate code

**Shortcomings**:
- No built-in DataLoader support, need lots of boilerplate code
- Need to manually manage DataLoader instance lifecycle
- Need to manually inject DataLoader in Context

**Conclusion**: No built-in DataLoader support provided, requires lots of Context boilerplate code and DataLoader boilerplate code. Need to manually create DataLoader instances, define Context type, configure Context injection, lots of boilerplate code.

### Resolvers & Validation Summary

| Evaluation Item                          | Score   | Description                                                                                                |
| :--------------------------------------- | :------ | :--------------------------------------------------------------------------------------------------------- |
| **Developer Experience**                 | **4.0** | Code is concise, template code amount is moderate, requires minimal configuration, code structure is clear |
| **Modular Design**                       | **4.0** | Supports domain modularity, provides modular API, but Query and Mutation are separated, need manual export |
| **Argument Definition & Type Inference** | **4.0** | Argument types are mostly automatically inferred, few need explicit declaration                            |
| **Input Validation Mechanism**           | **3.0** | Supports validation, but requires manual validation logic writing                                          |
| **Batch Loading (DataLoader)**           | **0.0** | No built-in support, requires lots of boilerplate code                                                     |

**Overall Score: 3.0**

Nexus's resolver definition uses Builder API + code generation pattern, provides good modular support and type safety, but requires manual implementation of validation logic and DataLoader integration. Modular design is excellent, supports organizing code by domain, but validation and DataLoader require lots of manual work.

## 4. Built-in Features (Built-in Features)

### Built-in Features Overview

Nexus provides feature extension through plugin system, core features (Context, Subscriptions, Custom Scalars, Directives) are built-in, advanced features (Middleware, Query Complexity) are implemented through plugins. DataLoader and depth limiting need to be implemented manually or through GraphQL Server plugins.

**Core Implementation Locations**:
- `src/plugin.ts`: Plugin system implementation
- `src/plugins/`: Built-in plugins directory
- `src/extensions.ts`: Extension feature support
- `src/definitions/directive.ts`: Directive support
- `src/definitions/scalarType.ts`: Custom scalar support
- `src/definitions/subscriptionType.ts`: Subscription support

### Built-in Features Evaluation Table

| Feature                             | Status                             | Description                                                                                         |
| :---------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Directive Support (Directives)**  | ✅ Built-in                         | Define through `directive()` API, supports Schema and Request directives                            |
| **Extension Support (Extensions)**  | ✅ Built-in                         | Supports GraphQL Extensions through `extensions` configuration                                      |
| **Batch Loading (DataLoader)**      | ⛔ Cannot implement                 | No built-in support, need to manually create DataLoader instances and configure Context             |
| **Custom Scalars (Scalars)**        | ✅ Built-in                         | Define through `scalarType()` API, supports `asNexusMethod` to extend Builder API                   |
| **Subscription (Subscription)**     | ✅ Built-in                         | Supports through `subscriptionType()` and `subscriptionField()` API                                 |
| **Context Injection**               | ✅ Built-in                         | Through `contextType` configuration, types automatically inferred through code generation           |
| **Middleware (Middleware)**         | ⚠️ Plugin/Additional Implementation | Implemented through plugin system's `onCreateFieldResolver` hook, requires custom plugin            |
| **Query Complexity Analysis**       | ⚠️ Plugin/Additional Implementation | Implemented through `queryComplexityPlugin` plugin, requires `graphql-query-complexity` library     |
| **Depth Limiting (Depth Limiting)** | ⛔ Cannot implement                 | No built-in support, need to implement through GraphQL Server plugins (e.g., `graphql-depth-limit`) |

### Detailed Feature Analysis

#### 4.1 Directive Support (Directives)

**Status: ✅ Built-in**

**Implementation Method**:
- **Define Directives**: Define directives through `directive()` API (`src/definitions/directive.ts:51-90`)
- **Use Directives**: Use directives through `addDirective()` or `directives` configuration
- **Supported Locations**: Supports Schema and Request directive locations

**Actual Usage Evidence**:
```typescript
// src/definitions/directive.ts:51-90
export interface NexusDirectiveConfig<DirectiveName extends string = string> {
  name: DirectiveName
  description?: string
  locations: MaybeReadonlyArray<SchemaDirectiveLocationEnum | RequestDirectiveLocationEnum>
  isRepeatable?: Maybe<boolean>
  args?: ArgsRecord
  extensions?: GraphQLDirectiveConfig['extensions']
}
```

**Conclusion**: Native support for defining and using GraphQL Directives, supports Federation architecture, API is concise and type safe.

#### 4.2 Extension Support (Extensions)

**Status: ✅ Built-in**

**Implementation Method**:
- **Extension Configuration**: Supports GraphQL Extensions through `extensions` configuration (`src/extensions.ts`)
- **Field Extensions**: Supports field-level extensions through `NexusFieldExtension`
- **Type Extensions**: Supports type-level extensions through `NexusObjectTypeExtension`, `NexusInterfaceTypeExtension`

**Actual Usage Evidence**:
```typescript
// src/extensions.ts:30-47
export class NexusFieldExtension<TypeName extends string = any, FieldName extends string = any> {
  readonly _type = 'NexusFieldExtension' as const
  readonly config: Omit<NexusOutputFieldConfig<TypeName, FieldName>, 'resolve'>
  readonly hasDefinedResolver: boolean
  readonly sourceType: string | FieldSourceType | NamedFieldSourceType[] | undefined
}
```

**Conclusion**: Native support for defining and using GraphQL Extensions, can declare query complexity, execution time and other extension information, API is intuitive.

#### 4.3 Batch Loading (DataLoader) Integration

**Status: ⛔ Cannot implement**

**Implementation Method**:
- **No Built-in Support**: Nexus does not provide built-in DataLoader support
- **Manual Implementation**: Need to manually create DataLoader instances, define Context type, configure Context injection

**Actual Usage**:
```typescript
// typescript-graphql-schemas/nexus/src/context.ts
export interface Context {
  // Need to manually add DataLoader instances
  // userLoader: DataLoader<number, User>
  // orderLoader: DataLoader<number, Order>
}
```

**Conclusion**: No built-in DataLoader support provided, and cannot be implemented through plugins, requires lots of Context boilerplate code and DataLoader boilerplate code.

#### 4.4 Custom Scalars (Scalars)

**Status: ✅ Built-in**

**Implementation Method**:
- **Define Scalars**: Define scalars through `scalarType()` API (`src/definitions/scalarType.ts:51-53`)
- **Extend Builder API**: Add scalars as Builder methods through `asNexusMethod`
- **Type Safety**: Provides type safety through code generation

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema.ts
const DateTime = scalarType({
  name: 'DateTime',
  asNexusMethod: 'dateTime',  // Extend Builder API
  description: 'DateTime scalar type',
  parseValue(value: unknown) {
    return DateTimeResolver.parseValue(value)
  },
  serialize(value: unknown) {
    return DateTimeResolver.serialize(value)
  },
  parseLiteral(ast) {
    return DateTimeResolver.parseLiteral(ast, {})
  },
})

// Usage
t.dateTime('createdAt')  // Method extended through asNexusMethod
```

**Conclusion**: Built-in support for common scalar types, defining new scalar types is simple, API is intuitive and type safe. Supports extending Builder API through `asNexusMethod`.

#### 4.5 Subscription (Subscription)

**Status: ✅ Built-in**

**Implementation Method**:
- **Define Subscription Type**: Define subscription type through `subscriptionType()` (`src/definitions/subscriptionType.ts:178-180`)
- **Define Subscription Fields**: Define subscription fields through `subscriptionField()` (`src/definitions/subscriptionField.ts:115-246`)
- **Async Iterator**: Supports returning async iterators (`AsyncIterator`)

**Actual Usage Evidence**:
```typescript
// src/definitions/subscriptionField.ts:19-24
subscribe(
  root: object,
  args: ArgsValue<'Subscription', FieldName>,
  ctx: GetGen<'context'>,
  info: GraphQLResolveInfo
): MaybePromise<AsyncIterator<Event>> | MaybePromiseDeep<AsyncIterator<Event>>
```

**Example**:
```typescript
subscriptionField('signup', {
  type: 'User',
  subscribe() {
    return pubsub.asyncIterator('signup')
  },
  async resolve(eventPromise: Promise<Event<User>>) {
    const event = await eventPromise
    return event.data
  },
})
```

**Conclusion**: Native support for GraphQL Subscriptions, supports real-time data push, underlying transport protocol compatibility is good (WebSocket, SSE, etc.), API is concise.

#### 4.6 Context Injection

**Status: ✅ Built-in**

**Implementation Method**:
- **Configure Context Type**: Specify Context type through `contextType` configuration (`src/makeSchema.ts:51-54`)
- **Automatic Type Inference**: Automatically infers Context type through code generation
- **Resolver Parameters**: Context is automatically injected as the third parameter of Resolver

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/schema.ts
export const schema = makeSchema({
  contextType: {
    module: join(__dirname, './context.ts'),
    export: 'Context',
  },
})

// typescript-graphql-schemas/nexus/src/context.ts
export interface Context {
  // Add context properties here if needed
}

// Context type automatically inferred in Resolver
resolve(_parent, { id }, ctx, info) {
  // ctx type is automatically inferred as Context
}
```

**Generated Types**:
```typescript
// nexus-typegen.d.ts
export interface NexusGenTypes {
  context: Context;
}
```

**Conclusion**: Native support for injecting context in Resolver, context type inference is complete, IDE hints are good, no manual type declarations needed.

#### 4.7 Middleware (Middleware)

**Status: ⚠️ Plugin/Additional Implementation**

**Implementation Method**:
- **Plugin System Support**: Implement middleware through plugin system's `onCreateFieldResolver` hook (`src/plugin.ts:113`)
- **Middleware Functions**: Define middleware functions through `MiddlewareFn` type (`src/plugin.ts:161-167`)
- **Compose Middleware**: Compose multiple middleware through `composeMiddlewareFns` (`src/plugin.ts:176-189`)

**Actual Usage Evidence**:
```typescript
// src/plugin.ts:161-167
export type MiddlewareFn = (
  source: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo,
  next: GraphQLFieldResolver<any, any>
) => any

// Plugin implements middleware
plugin({
  name: 'myMiddleware',
  onCreateFieldResolver(config) {
    return function (root, args, ctx, info, next) {
      // Middleware logic
      return next(root, args, ctx, info)
    }
  },
})
```

**Built-in Plugin Example**:
```typescript
// src/plugins/fieldAuthorizePlugin.ts:67-128
onCreateFieldResolver(config) {
  const authorize = config.fieldConfig.extensions?.nexus?.config.authorize
  if (authorize == null) {
    return
  }
  return function (root, args, ctx, info, next) {
    // Authorization middleware logic
    return plugin.completeValue(
      authorize(root, args, ctx, info),
      (authResult) => {
        if (authResult === true) {
          return next(root, args, ctx, info)
        }
        // Handle authorization failure
      }
    )
  }
}
```

**Conclusion**: Not built-in, but can implement middleware functionality through plugins or manually wrapping Resolver, requires additional configuration and boilerplate code.

#### 4.8 Query Complexity Analysis (Query Complexity)

**Status: ⚠️ Plugin/Additional Implementation**

**Implementation Method**:
- **Plugin Support**: Supports through `queryComplexityPlugin` plugin (`src/plugins/queryComplexityPlugin.ts:38-74`)
- **Field-Level Configuration**: Configure field complexity through `complexity` configuration
- **Requires Third-Party Library**: Requires `graphql-query-complexity` library

**Actual Usage Evidence**:
```typescript
// src/plugins/queryComplexityPlugin.ts:38-74
export const queryComplexityPlugin = () => {
  return plugin({
    name: 'query-complexity',
    fieldDefTypes,
    onCreateFieldResolver(config) {
      const complexity = config.fieldConfig.extensions?.nexus?.config.complexity
      if (complexity == null) {
        return
      }
      // Add complexity to field's extensions
      config.fieldConfig.extensions = {
        ...config.fieldConfig.extensions,
        complexity,
      } as any
    },
  })
}
```

**Usage Example**:
```typescript
t.field('posts', {
  type: list('Post'),
  complexity: (options) => {
    return options.childComplexity * (options.args.limit ?? 10)
  },
  resolve() {
    // ...
  },
})
```

**Conclusion**: Not built-in, but can implement complexity analysis through `queryComplexityPlugin` plugin, requires `graphql-query-complexity` library, needs additional configuration.

#### 4.9 Depth Limiting (Depth Limiting)

**Status: ⛔ Cannot implement**

**Implementation Method**:
- **No Built-in Support**: Nexus does not provide depth limiting functionality
- **Need Server Implementation**: Need to implement through GraphQL Server plugins (e.g., `graphql-depth-limit`)

**Analysis**:
- ❌ Completely does not support depth limiting
- ❌ Cannot prevent depth query attacks
- ⚠️ Can be implemented through GraphQL Server plugins (e.g., `graphql-yoga`'s `graphql-depth-limit` plugin), but requires additional configuration

**Conclusion**: Completely does not support depth limiting, cannot prevent depth query attacks. Need to implement through GraphQL Server plugins, requires additional configuration.

### Built-in Features Summary

| Evaluation Item                     | Status                             | Description                                                           |
| :---------------------------------- | :--------------------------------- | :-------------------------------------------------------------------- |
| **Directive Support (Directives)**  | ✅ Built-in                         | Native support for defining and using GraphQL Directives              |
| **Extension Support (Extensions)**  | ✅ Built-in                         | Native support for GraphQL Extensions                                 |
| **Batch Loading (DataLoader)**      | ⛔ Cannot implement                 | No built-in support, need manual implementation                       |
| **Custom Scalars (Scalars)**        | ✅ Built-in                         | Native support for custom scalars, supports extending Builder API     |
| **Subscription (Subscription)**     | ✅ Built-in                         | Native support for GraphQL Subscriptions                              |
| **Context Injection**               | ✅ Built-in                         | Native support for Context injection, types automatically inferred    |
| **Middleware (Middleware)**         | ⚠️ Plugin/Additional Implementation | Implemented through plugin system, requires custom plugin             |
| **Query Complexity Analysis**       | ⚠️ Plugin/Additional Implementation | Implemented through `queryComplexityPlugin` plugin                    |
| **Depth Limiting (Depth Limiting)** | ⛔ Cannot implement                 | No built-in support, need to implement through GraphQL Server plugins |

**Overall Score: 3.2**

**Scoring Basis**:
- Directives: ✅ Built-in (5 points) - Define through `directive()` API, supports Schema and Request directives
- Extensions: ✅ Built-in (5 points) - Supports GraphQL Extensions through `extensions` configuration
- DataLoader: ⛔ Cannot implement (0 points) - No built-in support, need to manually create DataLoader instances
- Scalars: ✅ Built-in (5 points) - Define through `scalarType()` API, supports `asNexusMethod` extension
- Subscription: ✅ Built-in (5 points) - Through `subscriptionType()` and `subscriptionField()` API
- Context: ✅ Built-in (5 points) - Through `contextType` configuration, types automatically inferred through code generation
- Middleware: ⚠️ Plugin/Additional Implementation (2 points) - Implemented through plugin system's `onCreateFieldResolver` hook
- Query Complexity: ⚠️ Plugin/Additional Implementation (2 points) - Implemented through `queryComplexityPlugin` plugin
- Depth Limiting: ⛔ Cannot implement (0 points) - No built-in support, need to implement through GraphQL Server plugins

**Total Score: 29/45 = 3.2/5.0**

**Scoring Basis**:
- Core features support well: Context, Subscriptions, Custom Scalars, Directives, Extensions all provide native support
- Advanced features support limited: Middleware, Query Complexity implemented through plugins, DataLoader and depth limiting not supported
- Feature completeness: Out of 9 features, 5 are built-in, 2 are plugin/additional implementation, 2 cannot be implemented

**Advantages**:
1. **Core features complete**: Context, Subscriptions, Custom Scalars, Directives, Extensions all provide native support
2. **Plugin system flexible**: Can extend features through plugin system (Middleware, Query Complexity)
3. **Type safety**: All supported features have complete type inference

**Disadvantages**:
1. **DataLoader not supported**: No built-in DataLoader support, requires lots of boilerplate code
2. **Depth limiting not supported**: No built-in depth limiting, need to implement through Server plugins
3. **Middleware requires plugins**: Middleware functionality needs to be implemented through plugins, not intuitive enough

## 5. Ecosystem Integration (Ecosystem Integration)

### Ecosystem Integration Overview

Nexus adopts **standard GraphQL Schema output + plugin system** strategy. Outputs standard `GraphQLSchema` through `makeSchema()`, can integrate with any GraphQL Server. ORM integration is implemented through `nexus-plugin-prisma` plugin, but requires manual Resolver logic writing. Validation library integration needs manual implementation, no built-in support.

**Core Integration Locations**:
- `examples/with-prisma/`: Prisma ORM integration example
- `examples/apollo-fullstack/`: Apollo Server integration example
- `docs/content/030-plugins/050-prisma/`: Prisma plugin documentation
- `src/plugin.ts`: Plugin system implementation

### 5.1 ORM Integration Depth (ORM Integration Depth)

**Score: <-To be scored->**

**Implementation Method**:
- **Plugin Support**: Provides `nexus-plugin-prisma` plugin (`docs/content/030-plugins/050-prisma/010-overview.mdx`)
- **Manual Integration**: Can also integrate Prisma manually (`examples/with-prisma/api.ts`)
- **Type Inference**: Infers types from Prisma Client through `sourceTypes` configuration (`examples/with-prisma/api.ts:12-14`)
- **Need Manual Resolver Writing**: Even with plugin, need to manually write Resolver logic

**Prisma Plugin Integration**:
```typescript
// docs/content/030-plugins/050-prisma/010-overview.mdx
import { nexusPrisma } from 'nexus-plugin-prisma'
import { makeSchema } from 'nexus'

const schema = makeSchema({
  types,
  plugins: [nexusPrisma()],
})
```

**Manual Prisma Integration**:
```typescript
// examples/with-prisma/api.ts
import { PrismaClient } from '@prisma/client'
import { makeSchema, objectType, queryType } from 'nexus'

const prisma = new PrismaClient()

const schema = makeSchema({
  sourceTypes: {
    modules: [{ module: '.prisma/client', alias: 'PrismaClient' }],
  },
  contextType: {
    module: path.join(__dirname, 'context.ts'),
    export: 'Context',
  },
  types: [
    objectType({
      name: 'User',
      definition(t) {
        t.id('id')
        t.string('name')
      },
    }),
    queryType({
      definition(t) {
        t.list.field('users', {
          type: 'User',
          resolve(_root, _args, ctx) {
            return ctx.prisma.user.findMany()  // Manually write query logic
          },
        })
      },
    }),
  ],
})
```

**Context Definition**:
```typescript
// examples/with-prisma/context.ts
import { PrismaClient } from '@prisma/client'

export type Context = {
  prisma: PrismaClient
}
```

**Analysis**:
- ✅ Provides Prisma plugin support, but plugin is being rewritten (`docs/content/030-plugins/050-prisma/040-removing-the-nexus-plugin-prisma.mdx:9`)
- ✅ Supports inferring types from Prisma Client through `sourceTypes`
- ⚠️ Need to manually write all database query logic, even with plugin need to manually implement Resolver
- ⚠️ Does not support other ORMs (e.g., Drizzle, TypeORM, MikroORM)
- ⚠️ Type synchronization needs manual maintenance, ORM model definitions are separated from GraphQL Schema definitions

**Conclusion**: Basic integration. Supports integrating Prisma through plugins or manually, can reuse some model definitions, but requires more configuration and boilerplate code. Does not support other ORMs.

### 5.2 Validation Library Integration (Validation Library Integration)

**Score: <-To be scored->**

**Implementation Method**:
- **No Built-in Validation Support**: Nexus does not provide built-in validation functionality
- **Manual Validation**: Need to manually call validation functions in Resolver
- **Validation Library Integration**: Usually uses validation libraries like Zod, but needs manual implementation

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/nexus/src/utils/validate.ts
import { GraphQLError } from 'graphql'
import { z } from 'zod'

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issues = result.error.issues || []
    const firstError = issues[0]
    const errorMessage = firstError?.message || 'Validation failed'
    throw new GraphQLError(errorMessage)
  }
  return result.data
}
```

**Validation Usage**:
```typescript
// typescript-graphql-schemas/nexus/src/schema/user.ts
t.nonNull.field('createUser', {
  type: User,
  args: {
    name: nonNull(stringArg()),
    email: nonNull(stringArg()),
  },
  resolve(_parent, { name, email }) {
    // Manually call validation function
    parse(z.string().email(), email)

    const id = incrementId()
    const newUser = { id, name, email }
    userMap.set(id, newUser)
    return newUser
  },
})
```

**Analysis**:
- ❌ No built-in validation support: Does not provide official plugin or integration for validation libraries
- ❌ Need manual implementation: Must manually write validation logic and call validation functions
- ❌ Validation logic separated from Schema definition: Validation rules cannot be directly specified in Schema definition
- ⚠️ Can manually integrate: Although can manually use validation libraries like Zod, requires lots of boilerplate code
- ⚠️ Type synchronization needs manual maintenance: Validation rules are separated from GraphQL Schema type definitions

**Conclusion**: Weak integration. Can only use validation libraries manually, validation logic is separated from Schema definition, requires lots of boilerplate code.

### 5.3 GraphQL Server Compatibility (Server Compatibility)

**Score: <-To be scored->**

**Implementation Method**:
- **Standard GraphQL Schema Output**: Outputs standard `GraphQLSchema` instance through `makeSchema()`
- **Fully Compatible**: Compatible with all mainstream GraphQL Servers (Apollo Server, GraphQL Yoga, Envelop, Hono, etc.)
- **No Adapter Needed**: Does not need official adapter, directly uses standard GraphQL Server API

**Actual Usage Evidence**:
```typescript
// examples/apollo-fullstack/src/index.ts
import { ApolloServer } from 'apollo-server'
import { makeSchema } from 'nexus'

const schema = makeSchema({
  types,
  outputs: {
    schema: path.join(__dirname, '../fullstack-schema.graphql'),
    typegen: path.join(__dirname, 'fullstack-typegen.ts'),
  },
  contextType: {
    module: path.join(__dirname, 'context.ts'),
    export: 'Context',
  },
})

const server = new ApolloServer({
  schema,  // Directly use standard GraphQLSchema
  context,
})
```

**GraphQL Yoga Integration**:
```typescript
import { createYoga } from 'graphql-yoga'
import { schema } from './schema'

const yoga = createYoga({ schema })  // Directly use standard GraphQLSchema
```

**Analysis**:
- ✅ Fully compatible: Outputs standard `GraphQLSchema`, compatible with all GraphQL Servers
- ✅ No adapter needed: Does not need official adapter, directly uses standard GraphQL Server API
- ✅ Flexible integration: Can integrate with any GraphQL Server, including Apollo Server, GraphQL Yoga, Envelop, Hono, etc.

**Conclusion**: Fully compatible. Outputs standard `GraphQLSchema`, compatible with all mainstream GraphQL Servers, no adapter needed.

### 5.4 Toolchain Integration (Toolchain Integration)

**Score: <-To be scored->**

#### TypeScript/JavaScript Support

**TypeScript Support**:
- **✅ Core Support**: Nexus is completely written in TypeScript (all files in `src/` directory are `.ts`), compiled to JavaScript, supports CommonJS and ESM dual format output
- **✅ Dual Format Output**: `package.json` (lines 29-30) provides `"main": "dist"` (CommonJS) and `"module": "dist-esm"` (ESM) formats
- **✅ Type Definitions**: `package.json` (line 31) provides `"types": "dist/index.d.ts"`, complete TypeScript type support
- **✅ All Official Examples are TypeScript**: Except `githunt-api`, all examples (`with-prisma`, `kitchen-sink`, `star-wars`, `apollo-fullstack`, `ts-ast-reader`, `ghost`, `zeit-typescript`) use TypeScript

**JavaScript Support**:
- **✅ Official Documentation Explicitly Supports**: `docs/content/040-adoption-guides/020-nexus-framework-users.mdx` (lines 19-21) explicitly states: "If you had been using TypeScript before only because Nexus Framework forced you to, then know that you can use JavaScript with `nexus` if you want."
- **✅ Official Example Verification**: `examples/githunt-api/` provides complete JavaScript usage example
  - `src/index.js`: Uses CommonJS `require()` to import Nexus
  - `src/schema.js`: Uses JavaScript to define GraphQL Schema
  - `jsconfig.json`: Configures `"checkJs": true` to enable JavaScript type checking
- **⚠️ But Primarily TypeScript-Focused**: Documentation homepage (`docs/content/index.mdx` line 9) describes as "TypeScript/JavaScript", but all other examples and documentation are primarily TypeScript

**Code Evidence**:

```javascript
// examples/githunt-api/src/index.js
// @ts-check
const { ApolloServer } = require('apollo-server')
const path = require('path')
const { makeSchema } = require('nexus')
const types = require('./schema')

const schema = makeSchema({
  types,
  outputs: {
    schema: path.join(__dirname, '../githunt-api-schema.graphql'),
    typegen: path.join(__dirname, './githunt-typegen.ts'),
  },
  prettierConfig: require.resolve('../../../.prettierrc'),
})

const server = new ApolloServer({
  // @ts-ignore
  schema,
})

const port = process.env.PORT || 4000

server.listen({ port }, () => console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`))
```

```json
// package.json
{
  "main": "dist",
  "module": "dist-esm",
  "types": "dist/index.d.ts"
}
```

#### Runtime Environment Support

**Node.js**:
- **✅ Explicitly Supported**: All official examples are Node.js environment
  - `examples/with-prisma/api.ts`: Uses Express and Apollo Server
  - `examples/kitchen-sink/package.json`: Uses `ts-node` to run
  - `examples/star-wars/package.json`: Uses `ts-node-dev` to run
- **✅ Source Code Depends on Node.js APIs**: Source code extensively uses Node.js-specific APIs
  - `src/node.ts`: Provides `nodeImports()` function, uses `require('fs')` and `require('path')`
  - `src/typegenUtils.ts` (line 12): Uses `process.cwd()` to get current working directory
  - `src/makeSchema.ts` (lines 43, 47): Uses `process.exit()` to exit process
  - `src/plugins/connectionPlugin.ts` (lines 350, 354): Uses `Buffer.from()` for base64 encoding/decoding
  - `src/utils.ts` (line 472): Uses `require('../package.json')` to read package info
- **✅ Type Generation Depends on File System**: `src/typegenMetadata.ts` uses `fs.promises.readFile()` and `fs.promises.writeFile()` to read/write files

**Bun**:
- **⚠️ Theoretically Supported but Not Verified**:
  - Nexus outputs standard JavaScript code, theoretically can run in Bun
  - But source code extensively uses Node.js-specific APIs (`fs`, `path`, `process`, `Buffer`, `require`), these may not be compatible in Bun
  - No Bun-related documentation, examples, or configuration
  - All example projects are Node.js environment

**Deno**:
- **⚠️ Theoretically Supported but Not Verified**:
  - Nexus outputs standard JavaScript code, theoretically can run in Deno
  - But source code extensively uses Node.js-specific APIs, requires Deno compatibility layer support
  - No Deno-related documentation, examples, or configuration
  - All example projects are Node.js environment

**Cloudflare Workers**:
- **❌ Not Supported**:
  - Type generation functionality depends on file system (`fs`, `path`), Cloudflare Workers does not support file system access
  - Uses Node.js-specific APIs like `process`, `Buffer`, Cloudflare Workers environment does not support
  - No Cloudflare Workers-related documentation, examples, or configuration

**Browser**:
- **❌ Not Supported**:
  - Type generation functionality depends on file system, browser environment does not support file system access
  - Uses Node.js-specific APIs like `process`, `Buffer`, `require`, browser environment does not support
  - No browser runtime examples or documentation

**Code Evidence**:

```typescript
// src/node.ts
export function nodeImports() {
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  return {
    fs,
    path,
  }
}
```

```typescript
// src/typegenUtils.ts
function getOutputPaths() {
  const defaultSDLFilePath = nodeImports().path.join(process.cwd(), 'schema.graphql')
  // ...
}
```

```typescript
// src/makeSchema.ts
typegenPromise
  .then(() => {
    console.log(`Generated Artifacts:
    TypeScript Types  ==> ${typegenPath}
    GraphQL Schema    ==> ${typegenConfig.outputs.schema || '(not enabled)'}`)
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

```typescript
// src/plugins/connectionPlugin.ts
function base64Encode(str: string) {
  return Buffer.from(str, 'utf8').toString('base64')
}

function base64Decode(str: string) {
  return Buffer.from(str, 'base64').toString('utf8')
}
```

#### Build Tool Support

**TypeScript Compiler (tsc)**:
- **✅ Core Build Method**: All official examples use TypeScript compiler (`tsc`) for building
  - `examples/with-prisma/package.json` (line 6): `"build": "yarn build:reflection && tsc"`
  - `examples/kitchen-sink/package.json` (line 6): `"build": "ts-node --log-error src/index.ts"`
  - Framework's own build: `package.json` (line 33): `"build": "yarn -s clean && tsc -p tsconfig.cjs.json && tsc -p tsconfig.esm.json"`
- **✅ Dual Format Output Configuration**:
  - `tsconfig.cjs.json`: Outputs CommonJS format (`"module": "CommonJS"`)
  - `tsconfig.esm.json`: Outputs ESM format (`"module": "ES2015"`)

**esbuild**:
- **✅ Documentation Mentions Support**: `docs/content/040-adoption-guides/020-nexus-framework-users.mdx` (lines 172-174) explicitly lists `esbuild` as one of the recommended bundling tools
- **✅ Test Verification**: `tests/esm/standalone.spec.ts` provides esbuild integration test example
- **⚠️ But No Official Configuration Example**: Documentation only mentions can be used, does not provide complete configuration example

**Other Bundling Tools**:
- **✅ Documentation Mentions Support**: `docs/content/040-adoption-guides/020-nexus-framework-users.mdx` (lines 172-174) lists `spack` and `ncc` as optional bundling tools
- **⚠️ But No Official Configuration Example**: Documentation only mentions can be used, does not provide complete configuration example

**Webpack**:
- **⚠️ No Official Configuration Example**:
  - Documentation and examples do not provide webpack configuration example
  - `docs/package.json` contains `webpack` dependency, but this is for documentation website build (Gatsby), not framework's own build tool integration
  - Theoretically can integrate through TypeScript compiler, but requires user to configure themselves

**Vite**:
- **⚠️ No Official Configuration Example**:
  - Documentation and examples do not provide vite configuration example
  - No vite-related configuration files or documentation
  - Theoretically can integrate through TypeScript compiler, but requires user to configure themselves

**Rspack**:
- **⚠️ No Official Configuration Example**:
  - Documentation and examples do not provide rspack configuration example
  - No rspack-related configuration files or documentation
  - Theoretically can integrate through TypeScript compiler, but requires user to configure themselves

**Code Evidence**:

```markdown
<!-- docs/content/040-adoption-guides/020-nexus-framework-users.mdx -->
3. Optional: Run a bundler yourself

   This is probably something you don't need to do. Nexus Framework took a packages-bundled approach to dependencies and this mean a large package size that bloated deployments necessitating techniques like tree-shaking (e.g. TypeScript dependency is over 50mb). This problem generally goes away when using the Nexus library directly. However bundling for serverless deployments can still be desirable especially if your non-development dependencies are heavy and not fully used at runtime. If you were relying on Nexus Framework bundling here are some tools you can try out yourself:

   - [`spack`](https://swc-project.github.io/docs/usage-spack-cli)
   - [`esbuild`](https://github.com/evanw/esbuild)
   - [`ncc`](https://github.com/vercel/ncc)

   These tools take care of TypeScript transpilation so you should be able to skip using `tsc` manually with the above tools.

   When you are bundling your app you may need to tweak your `tsconfig.json` to output ES modules rather than CJS modules. The options you will need to think about are [`module`](https://www.typescriptlang.org/tsconfig#module), [`moduleResolution`](https://www.typescriptlang.org/tsconfig#moduleResolution), and [`target`](https://www.typescriptlang.org/tsconfig#target). There are few ways to go about this, the following is one:

   ```json
   {
     "compilerOptions": {
       "moduleResolution": "Node",
       "target": "ES2015",
       "module": "ES2015"
     }
   }
   ```
```

```typescript
// tests/esm/standalone.spec.ts
it('should build the esbuild', async () => {
  const out = await esbuild.build({
    bundle: true,
    format: 'esm',
    target: 'esnext',
    // minify: true,
    mainFields: ['module', 'main'],
    external: ['path', 'fs', 'prettier'],
    entryPoints: [path.join(__dirname, 'esm-entry.js')],
    outdir: path.join(__dirname, 'out'),
    outExtension: { '.js': '.mjs' },
    metafile: true,
  })
})
```

**Analysis**:
- ✅ **TypeScript Native Support**: Framework is completely written in TypeScript, compiled to JavaScript, supports ESM and CommonJS dual format output
- ✅ **JavaScript Support**: Official documentation explicitly supports, provides complete JavaScript usage example (`githunt-api`)
- ✅ **Node.js Explicitly Supported**: All official examples are Node.js environment, source code extensively uses Node.js-specific APIs
- ⚠️ **Other Runtime Environments Limited**: Bun, Deno theoretically supported but not verified; browser, Cloudflare Workers not supported (depends on file system)
- ✅ **TypeScript Compiler Core Support**: All examples use `tsc` for building, framework itself also uses `tsc` for building
- ✅ **esbuild Documentation Support**: Documentation explicitly mentions support, provides test example
- ⚠️ **Other Build Tools No Official Configuration**: webpack, vite, rspack, etc. have no official configuration examples, requires users to configure themselves

### Ecosystem Integration Summary

| Evaluation Item                    | Score            | Description                                                                                                                         |
| :--------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **ORM Integration Depth**          | <-To be scored-> | Supports integrating Prisma through plugins or manually, requires more configuration and boilerplate code                           |
| **Validation Library Integration** | <-To be scored-> | Can only use validation libraries manually, requires lots of boilerplate code                                                       |
| **GraphQL Server Compatibility**   | <-To be scored-> | Fully compatible, outputs standard GraphQLSchema, no adapter needed                                                                 |
| **Toolchain Integration**          | <-To be scored-> | Supports TypeScript and JavaScript, primarily supports Node.js, supports tsc and esbuild, other build tools need self-configuration |

**Overall Score: 3.5**

**Scoring Basis**:
- GraphQL Server compatibility excellent: Outputs standard `GraphQLSchema`, compatible with all mainstream GraphQL Servers (5.0)
- Toolchain integration basic: Supports TypeScript and JavaScript, but primarily Node.js environment, other runtime environments have limited support (3.0)
- ORM integration basic: Supports Prisma plugin, but requires manual Resolver logic writing, does not support other ORMs (3.0)
- Validation library integration weak: No built-in validation support, requires manual implementation, validation logic separated from Schema definition (2.0)

**Advantages**:
1. **Fully Compatible GraphQL Server**: Outputs standard `GraphQLSchema`, compatible with all mainstream GraphQL Servers
2. **TypeScript/JavaScript Dual Support**: Official documentation explicitly supports JavaScript, provides complete examples
3. **Plugin System**: Can extend features through plugin system (e.g., Prisma integration)

**Disadvantages**:
1. **Runtime Environment Limited**: Primarily supports Node.js, browser and Cloudflare Workers not supported, Bun/Deno not verified
2. **ORM Integration Limited**: Only supports Prisma, does not support other ORMs (e.g., Drizzle, TypeORM, MikroORM)
3. **Validation Library Integration Weak**: No built-in validation support, requires manual implementation, validation logic separated from Schema definition
4. **Build Tool Configuration Limited**: Except tsc and esbuild, other build tools (webpack, vite, rspack) have no official configuration examples

## 📝 Summary

### Overall Score: 3.4/5.0

| Dimension              | Score | Description                                                                                              |
| ---------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| Architecture           | 4.0   | Builder pattern + code generation, minimal configuration, fully neutral                                  |
| Type Definition        | 3.0   | Builder API + code generation, more explicit declarations, good type safety                              |
| Resolvers & Validation | 3.0   | Excellent modularity, good type safety, but validation and DataLoader require manual implementation      |
| Built-in Features      | 3.2   | Core features complete, advanced features via plugins, DataLoader and depth limiting not supported       |
| Ecosystem Integration  | 3.5   | Excellent GraphQL Server and Web framework compatibility, limited ORM and validation library integration |

### Overall Evaluation

Nexus uses Builder pattern + code generation approach, defines Schema through functional Builder API, provides type safety through code generation, completely avoids decorators and runtime reflection, achieving a lightweight, type-safe GraphQL Schema building solution. Modular design is excellent, supports organizing code by domain. Although code generation is technically optional, it's almost required in practice for complete type safety.

### Core Advantages

1. **Minimal Dependencies**: Only depends on `graphql` standard library and two lightweight helper libraries
2. **Excellent Modularity**: `extendType()` API supports organizing code by domain modules, type definitions, Query, Mutation, Field Resolver are all in the same module
3. **Plugin System**: Can extend features through plugin system (Middleware, Query Complexity)
4. **Excellent GraphQL Server Compatibility**: Outputs standard `GraphQLSchema`, compatible with all mainstream GraphQL Servers
5. **Type Safety**: Provides complete type safety through code generation

### Main Disadvantages

1. **Requires Code Generation**: Although technically optional, almost required in practice for complete type safety
2. **Validation Requires Manual Implementation**: No built-in validation support, requires manual validation logic writing
3. **No DataLoader Support**: Requires manual implementation, lots of boilerplate code
4. **Type Definitions Require More Explicit Declarations**: Compared to auto-inference frameworks, requires more explicit code

### Use Cases

#### Recommended Use

- Medium to large projects requiring modular organization
- Projects requiring plugin system
- Projects requiring GraphQL Server compatibility
- Projects not minding code generation step

#### Not Recommended Use

- Projects requiring write-and-use (without running code generation)
- Projects requiring validation or DataLoader
- Projects requiring reduced explicit type declarations

### Improvement Suggestions

1. **Provide Validation and DataLoader Support**: Reduce manual implementation, improve development efficiency
2. **Reduce Code Generation Dependency**: Reduce code generation requirements through better type inference
3. **Enhance Type Inference Capabilities**: Reduce explicit type declarations, improve development experience
