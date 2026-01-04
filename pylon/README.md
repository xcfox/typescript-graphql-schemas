# Pylon Evaluation Report (January 2026)

> This report is generated based on actual business code (`typescript-graphql-schemas/pylon/src`) and official examples (`@pylon/examples`).

## 📋 Basic Information
| Project          | Content                            |
| :--------------- | :--------------------------------- |
| **Version**      | 2.9.6                              |
| **GitHub**       | https://github.com/getcronit/pylon |
| **Docs**         | https://pylon.cronit.io            |
| **First Commit** | 2023-11-24                         |
| **Last Commit**  | 2025-10-01                         |

## 📊 Overall Score
| Dimension                     | Score (1-5) | Brief Review                                                                                      |
| :---------------------------- | :---------- | :------------------------------------------------------------------------------------------------ |
| **1. Architecture**           | **2.5**     | Inference mode, requires build, deeply integrated with Hono                                       |
| **2. Type Definition**        | **3.75**    | Deep inference, zero-config enums, smart interface detection, powerful type inference             |
| **3. Resolvers & Validation** | **2.5**     | Clean code, automatic type inference, but validation and DataLoader require manual implementation |
| **4. Built-in Features**      | **3.1**     | Context/Middleware/Subscriptions are well-implemented, no built-in DataLoader support             |
| **5. Ecosystem Integration**  | **1.0**     | Basic ORM integration, no validation library integration, severe framework binding                |

---

## 1. Architecture

### Architecture Overview

Pylon adopts an **Inference (automatic inference) mode** to build GraphQL Schema. The framework uses TypeScript Compiler API to statically analyze source code, automatically inferring and generating GraphQL Schema from TypeScript type definitions and Resolver function signatures. Developers only need to write TypeScript code without manually defining Schema. The framework automatically generates `.pylon/schema.graphql` and `.pylon/resolvers.js` during build time.

**Core Implementation Locations**:
- `packages/pylon-builder/src/schema/builder.ts`: `SchemaBuilder` class, uses TypeScript Compiler API to analyze source code
- `packages/pylon-builder/src/schema/schema-parser.ts`: `SchemaParser` class, parses type definitions and generates GraphQL Schema
- `packages/pylon-builder/src/bundler/bundler.ts`: `Bundler` class, responsible for code bundling and Schema injection
- `packages/pylon/src/define-pylon.ts`: Runtime Resolver transformation logic

**Actual Usage Flow**:
```typescript
// 1. Write TypeScript code (src/index.ts)
export const graphql = {
  Query: {
    user: (id: Int): User => { ... }
  }
}

// 2. Run build command
pylon build  // or pylon dev

// 3. Auto-generated artifacts
// .pylon/schema.graphql - GraphQL Schema definition
// .pylon/resolvers.js - Union type resolvers
// .pylon/index.js - Bundled application code
```

### 1.1 Dependency Complexity

**Score: 3.0**

**Core Dependency Analysis**:
- **Runtime Dependencies** (lines 23-38 of `packages/pylon/package.json`):
  - `graphql: ^16.9.0` - GraphQL standard library
  - `graphql-yoga: ^5.6.2` - GraphQL Server implementation
  - `hono: ^4.0.8` - Web framework (deeply integrated)
  - `@envelop/core: ^5.0.3` - GraphQL plugin system
  - `graphql-scalars: ^1.24.0` - Common scalar types
  - `@sentry/bun`, `@sentry/node` - Error tracking
  - `jsonwebtoken`, `openid-client` - Authentication support
  - `consola`, `winston` - Logging libraries
  - `toucan-js` - Cloudflare Workers error tracking
- **Dev Dependencies** (`packages/pylon-dev/package.json`):
  - `@getcronit/pylon-builder` - Schema build tool (required)
  - `@gqty/cli` - Client code generation (optional)

**Evidence**:
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

**Analysis**:
- ⚠️ Many runtime dependencies (about 13), including complete GraphQL Server and Web framework
- ⚠️ Deeply integrated with Hono framework, `app` is a Hono instance (line 6 of `packages/pylon/src/app/index.ts`)
- ⚠️ Built-in Sentry integration increases dependency complexity
- ✅ No decorators or reflection metadata (`reflect-metadata`) required
- ✅ All dependencies are standard npm packages, no proprietary tools

**Actual Usage** (`typescript-graphql-schemas/pylon/package.json`):
- Business code needs to install `@getcronit/pylon` and `@getcronit/pylon-dev`
- Runtime dependencies are transitively installed, developers don't need to manage them manually

**Conclusion**: Medium dependencies. Requires multiple third-party libraries (GraphQL Server, Web framework, authentication, logging, etc.), but all are standard libraries with no proprietary tools.

### 1.2 Build Flow

**Score: 2.0**

**Build Method**:
- **Must run build command**: `pylon build` or `pylon dev` to generate Schema (lines 19-37 of `packages/pylon-dev/src/index.ts`)
- **Code generation mechanism**: Uses TypeScript Compiler API to analyze source code, generating GraphQL Schema and Resolver code
- **Build artifacts**: Generates `.pylon/schema.graphql`, `.pylon/resolvers.js`, and `.pylon/index.js`

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/pylon/package.json
"scripts": {
  "dev": "pylon dev",
  "build": "pylon build",
  "print": "pylon build && cp .pylon/schema.graphql schema.graphql"
}
```

**Code Generation Mechanism**:
- **Schema generation**: `packages/pylon-builder/src/schema/builder.ts` (lines 96-143) uses TypeScript Compiler API to analyze `graphql` exports
- **Type parsing**: `packages/pylon-builder/src/schema/schema-parser.ts` parses TypeScript types and converts them to GraphQL types
- **Code injection**: `packages/pylon-builder/src/bundler/bundler.ts` (lines 48-89) injects Schema and Resolver code during build

**Core Implementation**:
```typescript
// packages/pylon-builder/src/index.ts:19-40
export const build = async (options: BuildOptions) => {
  const bundler = new Bundler(options.sfiFilePath, options.outputFilePath)
  
  return await bundler.build({
    getBuildDefs: () => {
      const builder = new SchemaBuilder(
        path.join(process.cwd(), options.sfiFilePath)
      )
      const built = builder.build()  // Uses TypeScript Compiler API for analysis
      
      return {
        typeDefs: built.typeDefs,      // Generate GraphQL Schema
        resolvers: built.resolvers     // Generate Union type resolvers
      }
    },
    watch: options.watch,
    onWatch: options.onWatch
  })
}
```

**Build Artifact Structure**:
```
.pylon/
├── schema.graphql    # Generated GraphQL Schema
├── resolvers.js      # Generated Union type resolvers
└── index.js          # Bundled application code (includes injected Schema)
```

**Actual Generated Content** (`typescript-graphql-schemas/pylon/.pylon/resolvers.js`):
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

**Shortcomings**:
- ⚠️ **Must run build command**: Code cannot run directly, must execute `pylon build` first
- ⚠️ **Development experience impact**: Need to wait for build completion on first run or after Schema changes
- ⚠️ **Opaque build process**: Uses TypeScript Compiler API and esbuild, build process is opaque to developers
- ⚠️ **Code injection**: Injects Schema code through esbuild plugin during build (lines 48-89 of `bundler.ts`), may affect debugging

**Conclusion**: Explicit build. Must run CLI command to generate Schema files or type definitions before code can compile or run. Build process uses TypeScript Compiler API and code injection, relatively complex.

### 1.3 Config & Language Magic

**Score: 3.0**

**Technical Implementation**:
- **Uses TypeScript Compiler API**: Generates Schema through static analysis of TypeScript source code (lines 12-26 of `packages/pylon-builder/src/schema/builder.ts`)
- **No decorators required**: All type definitions use native TypeScript classes and interfaces
- **No reflection metadata required**: Does not depend on `reflect-metadata` or runtime reflection
- **Type inference**: Automatically infers GraphQL types by analyzing function signatures and return types

**Core Implementation Evidence**:
```typescript
// packages/pylon-builder/src/schema/builder.ts:12-26
constructor(sfiFilePath: string) {
  this.sfiFilePath = sfiFilePath
  
  const tsConfigOptions = this.loadTsConfigOptions()
  
  const filesInSfiDir = ts.sys
    .readDirectory(path.dirname(this.sfiFilePath), ['.ts'], ['.d.ts'])
    .concat([path.join(path.dirname(this.sfiFilePath), '..', 'pylon.d.ts')])
  
  this.program = ts.createProgram(filesInSfiDir, tsConfigOptions)
  this.checker = this.program.getTypeChecker()  // Uses TypeScript Compiler API
}
```

**Actual Usage**:
```typescript
// typescript-graphql-schemas/pylon/src/index.ts
// Completely native TypeScript, no decorators
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
    user: (id: Int): User => { ... }  // Function signature automatically infers type
  }
}
```

**Type Inference Mechanism**:
- **Function parameter inference**: Infers GraphQL input types from function parameter types (`packages/pylon-builder/src/schema/schema-parser.ts`)
- **Return type inference**: Infers GraphQL output types from function return types
- **Class property inference**: Infers GraphQL field types from class public properties
- **Union type inference**: Automatically generates GraphQL Union types from TypeScript union types

**Actual Usage Evidence**:
```typescript
// typescript-graphql-schemas/pylon/src/index.ts:227-237
export const graphql = {
  Query: {
    users: (): User[] => { ... },           // Automatically infers return [User!]!
    user: (id: Int): User => { ... },        // Automatically infers parameter Int!, return User!
    menu: (): MenuItem[] => { ... }          // Automatically infers Union type
  }
}
```

**Configuration Requirements**:
- **TypeScript configuration**: Requires standard `tsconfig.json`, but no special configuration needed (lines 54-94 of `packages/pylon-builder/src/schema/builder.ts`)
- **No experimental features**: Does not require `experimentalDecorators` or `emitDecoratorMetadata`
- **Type declaration file**: Requires `pylon.d.ts` to extend types (`typescript-graphql-schemas/pylon/pylon.d.ts`)

**Shortcomings**:
- ⚠️ **Build-time analysis**: Although no runtime reflection is needed, build-time use of TypeScript Compiler API increases build complexity
- ⚠️ **Type declaration file**: Need to manually create `pylon.d.ts` to extend Context types (though this is standard TypeScript practice)

**Conclusion**: Minimal configuration. Only requires a small amount of intuitive configuration, mainly relies on TypeScript's own type inference and Compiler API static analysis. No decorators or reflection metadata required, but build-time analysis is needed.

### 1.4 Ecosystem Integration

**Score: 2.0**

**Integration Method**:
- **Deep Hono integration**: `app` is a Hono instance (line 6 of `packages/pylon/src/app/index.ts`), cannot replace underlying framework
- **GraphQL Yoga integration**: Uses GraphQL Yoga as GraphQL Server (lines 131-155 of `packages/pylon/src/app/handler/pylon-handler.ts`)
- **Envelop plugin support**: Supports Envelop plugins through `config.plugins` (lines 21-27 of `packages/pylon/src/index.ts`)

**Core Implementation Evidence**:
```typescript
// packages/pylon/src/app/index.ts:6
export const app = new Hono<Env>()  // Deeply integrated with Hono

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
    ...(config?.plugins || [])  // Supports Envelop plugins
  ],
  schema
})
```

**Deployment Platform Support**:
- **Cloudflare Workers**: Official example (`examples/cloudflare-drizzle-d1`) demonstrates Cloudflare Workers deployment
- **Node.js**: Supports standard Node.js environment (lines 40-42 of `packages/pylon/package.json` require Node >= 18)
- **Bun**: Supports Bun runtime (official example `examples/bun-testing`)
- **Deno**: Supports Deno runtime (official template `packages/create-pylon/templates/deno`)

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
import { app } from '@getcronit/pylon'

// app is a Hono instance, can directly use Hono middleware
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

export default app  // Export Hono app
```

**Official Examples** (`examples/` directory):
- `cloudflare-drizzle-d1`: Cloudflare Workers + Drizzle ORM integration
- `nodejs-subscriptions`: Node.js subscription support
- `envelop-plugins`: Envelop plugin integration example
- `interfaces-and-unions`: Interface and union type examples

**Shortcomings**:
- ⚠️ **Strong framework binding**: Deeply integrated with Hono, cannot replace underlying Web framework
- ⚠️ **GraphQL Server binding**: Uses GraphQL Yoga, though can be extended through Envelop plugins, cannot be replaced
- ⚠️ **Installation method**: Although can be installed via `npm install`, framework design assumes Hono usage, integrating into other frameworks requires adaptation

**Conclusion**: Environment sensitive. Although installable, has special requirements for runtime environment (must use Hono as Web framework). Although supports multiple runtimes (Node.js, Bun, Deno, Cloudflare Workers), underlying framework binding limits flexibility.

### Architecture Overall Score

**Score: 2.5**

**Scoring Basis**:
- Dependency complexity: <-待评分-> (Medium dependencies, includes complete GraphQL Server and Web framework)
- Build flow: <-待评分-> (Explicit build, must run build command)
- Config & language magic: <-待评分-> (Minimal config, uses TypeScript Compiler API static analysis)
- Ecosystem integration: <-待评分-> (Environment sensitive, deeply integrated with Hono, cannot flexibly replace)

**Advantages**:
1. **Automatic type inference**: Automatically generates Schema from source code through TypeScript Compiler API, reducing manual definitions
2. **Zero decorators**: Completely uses native TypeScript, no decorators or reflection metadata needed
3. **Type safety**: Automatically infers GraphQL types from TypeScript types, ensuring type consistency
4. **Multi-runtime support**: Supports Node.js, Bun, Deno, Cloudflare Workers

**Disadvantages**:
1. **Must build**: Cannot run directly, must execute build command to generate Schema first
2. **Framework binding**: Deeply integrated with Hono, cannot replace underlying Web framework
3. **Many dependencies**: Runtime dependencies include complete GraphQL Server and Web framework
4. **Build complexity**: Uses TypeScript Compiler API and code injection, build process is relatively complex

## 2. Type Definition

### Core Implementation Mechanism

Pylon adopts **TypeScript Compiler API static analysis + automatic inference** to implement type definitions. The framework automatically generates GraphQL Schema by analyzing TypeScript source code (classes, interfaces, union types, function signatures). TypeScript type definitions are the single source of truth, GraphQL Schema is completely derived from TypeScript types.

**Source Code Evidence**:
- Type analysis: `packages/pylon-builder/src/schema/builder.ts` (lines 96-143) uses TypeScript Compiler API to analyze types
- Schema generation: `packages/pylon-builder/src/schema/schema-parser.ts` (lines 558-1043) parses types and generates GraphQL Schema
- Business code example: `typescript-graphql-schemas/pylon/src/index.ts` (lines 13-87) defines TypeScript types, automatically generates GraphQL Schema

**Actual Usage Flow**:
```typescript
// 1. Define TypeScript types
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

// 2. Automatically generate GraphQL Schema at build time
// .pylon/schema.graphql contains:
// interface MenuItem { id: Int!, name: String!, price: Number! }
// type Coffee implements MenuItem { ... }
// type Dessert implements MenuItem { ... }
```

### Scoring Details

#### 2.1 Single Source of Truth Implementation

**Score: 4.0**

**Evidence**:
- **TypeScript types are the source**: `typescript-graphql-schemas/pylon/src/index.ts` (lines 13-87) defines TypeScript types
- **GraphQL Schema auto-generated**: Automatically generates GraphQL Schema from TypeScript types (`.pylon/schema.graphql`)
- **Deep type inference**: Supports automatic GraphQL type inference from class properties, function signatures, union types, etc.
- **Validation logic separated**: Validation requires manual implementation using `createDecorator` (lines 129-168), does not support automatic type generation from validation rules

**Code Example**:
```typescript
// typescript-graphql-schemas/pylon/src/index.ts:13-17
export interface Food {
  id: Int
  name: string
  price: number
}

// Automatically generated GraphQL Schema:
// interface MenuItem {
//   id: Int!
//   name: String!
//   price: Number!
// }
```

**Core Implementation** (`packages/pylon-builder/src/schema/schema-parser.ts`):
- Lines 558-1043: `processSchemaReference` method analyzes TypeScript types and generates GraphQL Schema
- Line 955: Uses `getPublicPropertiesOfType` to get class public properties
- Line 1019: Checks if class implements interface

**Shortcomings**:
- ⚠️ **Validation logic separated**: Validation requires manual implementation (using `createDecorator`), does not support automatic type generation from validation rules (e.g., Zod)
- ⚠️ **Explicit type markers needed**: Some types need explicit use of marker types like `Int`, `ID` (line 1), rather than pure TypeScript types

**Conclusion**: Deep inference. Core definition is Schema, GraphQL Schema is automatically extracted through TypeScript Compiler API, requires minimal auxiliary configuration. But validation logic requires manual implementation, does not support automatic type generation from validation rules.

#### 2.2 Enum & String Union Support

**Score: 5.0**

**Evidence**:
- **Zero-config reuse**: Directly supports TypeScript string union types, no manual registration needed
- **Automatic conversion**: String union types automatically convert to GraphQL enums

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Lines 10-11: Define string union types
export type SugarLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

**Generated GraphQL Schema** (lines 67-88 of `.pylon/schema.graphql`):
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

**Core Implementation** (`packages/pylon-builder/src/schema/type-definition-builder.ts`):
- Lines 175-200: `isPrimitiveUnion` detects string union types
- Lines 185-197: Enum members automatically extracted and converted
- Lines 199-220: Automatically generates enum type names

**Official Example** (`examples/interfaces-and-unions/src/index.ts`):
- Supports various union type scenarios: class unions, object type unions, interface unions, etc.

**Analysis**:
- ✅ Completely zero-config, directly uses TypeScript string union types
- ✅ Automatically handles input and output enums (generates `SugarLevel` and `SugarLevelInput`)
- ✅ Enum member names automatically extracted from string literals, no duplicate definitions needed

**Conclusion**: Zero-config reuse. Directly supports TypeScript native string union types (`'A' | 'B'`), no manual registration required. Enum member names automatically extracted from string literals, completely zero-config.

#### 2.3 Interface Inheritance & Union Type Experience

**Score: 4.0**

**Evidence**:
- **Automatic interface inheritance**: When classes implement interfaces, interface fields automatically inherit to GraphQL Schema
- **Union types automatically handled**: TypeScript union types automatically convert to GraphQL Union types
- **Smart interface detection**: Framework automatically detects common fields in Union types, generates interfaces (lines 313-348 of `packages/pylon-builder/src/schema/schema-parser.ts`)

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Lines 13-17: Define interface
export interface Food {
  id: Int
  name: string
  price: number
}

// Lines 66-74: Class implements interface
export class Coffee implements Food {
  constructor(
    public id: Int,
    public name: string,
    public price: number,
    public sugarLevel: SugarLevel,
    public origin: string,
  ) {}
}

// Line 87: Define union type
export type MenuItem = Coffee | Dessert
```

**Generated GraphQL Schema** (`.pylon/schema.graphql`):
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

**Core Implementation** (`packages/pylon-builder/src/schema/schema-parser.ts`):
- Lines 201-230: Detects common fields in Union types, automatically generates interfaces
- Lines 234-273: Handles cases where classes implement interfaces
- Lines 350-376: Generates `__resolveType` function for Union type resolution

**Generated Resolver** (`.pylon/resolvers.js`):
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

**Official Example** (`examples/interfaces-and-unions/src/index.ts`):
- Lines 3-26: Demonstrates classes implementing interfaces
- Lines 28-50: Demonstrates Union types (with common fields, automatically generates interface)
- Lines 52-65: Demonstrates Union types (without common fields)

**Shortcomings**:
- ⚠️ **Union type resolution requires field checks**: `__resolveType` determines type by checking field existence, need to ensure objects contain enough fields
- ⚠️ **Need to manually return `__typename`**: Need to manually set `__typename` field when creating objects (lines 300-307), though framework generates resolver, data source needs to contain type information

**Conclusion**: Smart inheritance. Supports field inheritance, Union type resolution handled through auto-generated `__resolveType` function, but need to ensure objects contain enough fields for type determination. Framework automatically detects common fields in Union types and generates interfaces.

#### 2.4 Type Inference Strength & Explicit Declaration Balance

**Score: 3.5**

**Evidence**:
- **Function signature automatic inference**: Automatically infers GraphQL types from function parameters and return types
- **Class property automatic inference**: Automatically infers GraphQL field types from class public properties
- **Complex type support**: Supports Promise, arrays, optional types, union types, etc.

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Lines 227-237: Function signature automatic inference
export const graphql = {
  Query: {
    users: (): User[] => { ... },           // Automatically infers return [User!]!
    user: (id: Int): User => { ... },        // Automatically infers parameter Int!, return User!
    menu: (): MenuItem[] => { ... }          // Automatically infers Union type array
  }
}
```

**Core Implementation** (`packages/pylon-builder/src/schema/schema-parser.ts`):
- Lines 842-1043: Analyzes function signatures, automatically infers parameter types and return types
- Lines 82-87: Supports Promise types (`type-definition-builder.ts`)
- Lines 159-174: Supports array types (`type-definition-builder.ts`)
- Lines 89-90: Supports optional types (`type-definition-builder.ts`)

**Type Inference Examples**:
```typescript
// Promise type automatically handled
async orders(): Promise<Order[]> {
  // Automatically infers return [Order!]!
}

// Optional parameters automatically handled
updateUser: (id: Int, name?: string, email?: string): User => {
  // Automatically infers name and email as optional parameters
}

// Array type automatically handled
items: Int[]  // Automatically infers as [Int!]!
```

**Shortcomings**:
- ⚠️ **Explicit type markers needed**: Some types need to use marker types like `Int`, `ID` (line 1), rather than pure TypeScript `number`, `string`, which limits fully automatic inference capability
- ⚠️ **Union types in input fields not supported**: Union types in input parameters will issue warning and default to first type (lines 829-836 of `schema-parser.ts`)

**Core Implementation Evidence**:
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

**Analysis**:
- ✅ **Powerful automatic inference capability**: Function signatures, class properties, Promise, arrays, optional types, etc. can all be automatically inferred
- ✅ **TypeScript Compiler API deep analysis**: Implements complete type inference through static analysis
- ⚠️ **Explicit type markers needed**: Marker types like `Int`, `ID` need explicit use, cannot completely rely on native TypeScript types
- ⚠️ **Input field Union limitation**: Union types in input parameters not supported, this is a clear feature limitation

**Conclusion**: Powerful inference. Can automatically derive most types through TypeScript Compiler API, function signatures and class properties can be automatically inferred, supports complex scenarios like Promise, arrays, optional types. But explicit type markers (`Int`, `ID`) and input field Union not supported limitation affects fully automatic inference capability.

### Type Definition Overall Score

**Score: 3.75**

**Scoring Basis**:
- Single source of truth: **4.0** (Deep inference, but validation logic requires manual implementation)
- Enum & string union: **5.0** (Zero-config reuse, completely automatic)
- Interface inheritance & union types: **4.0** (Smart inheritance, but requires field checks)
- Type inference strength: **3.5** (Powerful inference, function signatures and class properties automatically inferred, but explicit type markers needed)

**Advantages**:
1. **Completely automatic inference**: Automatically generates GraphQL Schema from TypeScript types, no manual definitions needed
2. **Zero-config enums**: String union types automatically convert to GraphQL enums, completely zero-config
3. **Smart interface detection**: Automatically detects common fields in Union types and generates interfaces
4. **Type safety**: Ensures type consistency through TypeScript Compiler API
5. **Powerful type inference**: Function signatures, class properties, Promise, arrays, optional types, etc. can all be automatically inferred

**Disadvantages**:
1. **Validation logic separated**: Validation requires manual implementation, does not support automatic type generation from validation rules
2. **Explicit type markers needed**: Some types need to use marker types like `Int`, `ID`, cannot completely rely on native TypeScript types
3. **Input field Union not supported**: Union types in input parameters will issue warning and default to first type

## 3. Resolvers & Validation

### Core Implementation Mechanism

Pylon adopts **functional Resolver + decorator validation** to implement resolver definitions. Resolvers are directly defined as regular functions, parameter types automatically inferred from function signatures, validation implemented through `createDecorator`, Field Resolvers implemented through class async methods, DataLoader requires manual creation and integration.

**Source Code Evidence**:
- Resolver transformation: `packages/pylon/src/define-pylon.ts` (lines 165-347) converts functional Resolvers to GraphQL Resolvers
- Parameter handling: `packages/pylon/src/define-pylon.ts` (lines 110-158) `spreadFunctionArguments` function handles parameter mapping
- Validation decorator: `packages/pylon/src/create-decorator.ts` (lines 3-68) implements validation decorator
- Business code example: `typescript-graphql-schemas/pylon/src/index.ts` (lines 227-398) demonstrates Resolver definitions

**Actual Usage Flow**:
```typescript
// 1. Define Resolver functions
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
      // Validation logic in validateEmail decorator
      const id = incrementId()
      return new User(id, name, email)
    })
  }
}

// 2. Field Resolver implemented through class methods
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

### Scoring Details

#### 3.1 Developer Experience (Code Conciseness)

**Score: 4.5**

**Evidence**:
- **Functional definition**: `typescript-graphql-schemas/pylon/src/index.ts` (lines 227-270) directly uses functions to define Resolvers, code is extremely concise
- **Automatic type inference**: Function parameters and return types automatically inferred, no manual GraphQL type declarations needed
- **Validation decorator**: Uses `createDecorator` to implement validation, code is concise (lines 129-168)
- **Field Resolver concise**: Implemented through class async methods, code is intuitive (lines 96-99)

**Code Example**:
```typescript
// Query Resolver - extremely concise definition
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

// Field Resolver - implemented through class methods
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**Core Implementation** (`packages/pylon/src/define-pylon.ts`):
- Lines 165-347: `resolversToGraphQLResolvers` function converts functional Resolvers to GraphQL Resolvers
- Lines 110-158: `spreadFunctionArguments` function handles parameter mapping, maps from GraphQL parameters to function parameters
- Lines 44-109: `wrapFunctionsRecursively` function recursively wraps functions, supports nested objects and methods

**Shortcomings**:
- ⚠️ **Need to manually create DataLoader**: DataLoader requires manual creation and configuration (lines 174-213)
- ⚠️ **Need to manually set Context**: Need to manually set loaders in middleware (lines 222-225)

**Analysis**:
- ✅ Extremely concise code: Functional definition, almost no boilerplate
- ✅ Automatic type inference: Parameter types and return types completely automatically inferred
- ✅ Validation decorator concise: Uses `createDecorator` to implement validation, code is clear
- ⚠️ DataLoader requires manual integration: Requires manual creation and configuration, more boilerplate

**Conclusion**: Clean code, moderate boilerplate. Functional definition is extremely concise, automatic type inference, but DataLoader requires manual integration.

#### 3.2 Modular Design (Domain-Driven Development Support)

**Score: 0.0**

**Evidence**:
- **Organized by operation type**: All Resolvers are in one `graphql` object, organized by Query/Mutation (`typescript-graphql-schemas/pylon/src/index.ts` lines 227-398)
- **Type definitions separated from Resolvers**: Type definitions (lines 13-123) and Resolvers (lines 227-398) are in the same file, but logically separated
- **Field Resolvers in classes**: Field Resolvers implemented through class methods (lines 96-122), together with type definitions
- **Requires manual organization**: Framework does not enforce modularity, developers need to consciously split files by domain

**Code Example**:
```typescript
// All Resolvers in one object
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

**Analysis**:
- ⚠️ **No modularity consideration**: Completely organized by operation type, all Query/Mutation in one object
- ⚠️ **Easy to write coupled giant files**: As business grows, single file becomes very large
- ✅ **Field Resolvers in classes**: Field Resolvers implemented through class methods, together with type definitions, logic is clear
- ⚠️ **Requires manual merging**: If splitting files by domain, need to manually merge `graphql` object

**Conclusion**: No modularity consideration. Completely organized by operation type (Query/Mutation), requires manual merging of arrays or objects, easy to write coupled giant files.

#### 3.3 Parameter Definition & Type Inference

**Score: 5.0**

**Evidence**:
- **Parameter types completely automatically inferred**: Automatically infers GraphQL parameter types from function signatures (lines 218-235 of `packages/pylon/src/define-pylon.ts`)
- **Supports optional parameters**: TypeScript optional parameters automatically convert to GraphQL optional parameters (line 279 of `typescript-graphql-schemas/pylon/src/index.ts`)
- **Parameter order automatically handled**: `spreadFunctionArguments` function automatically handles parameter order (lines 110-158 of `packages/pylon/src/define-pylon.ts`)

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Parameter types completely automatically inferred
user: (id: Int): User => { ... }  // Automatically infers parameter Int!

// Optional parameters automatically handled
updateUser: (id: Int, name?: string, email?: string): User => {
  // name and email automatically inferred as optional parameters
}

// Array parameters automatically handled
createOrder: (userId: Int, items: Int[]): Order => {
  // items automatically inferred as [Int!]!
}
```

**Core Implementation** (`packages/pylon/src/define-pylon.ts`):
- Lines 218-235: Gets field parameters from GraphQL Schema, automatically maps to function parameters
- Lines 110-158: `spreadFunctionArguments` function handles parameter mapping and order
- Line 144: `orderedArgs` automatically arranged by function parameter order

**Generated GraphQL Schema** (`.pylon/schema.graphql`):
```graphql
type Query {
  user(id: Int!): User!
}

type Mutation {
  updateUser(id: Int!, name: String, email: String): User!
  createOrder(userId: Int!, items: [Int!]!): Order!
}
```

**Analysis**:
- ✅ Parameter types completely automatically inferred, no manual declarations needed
- ✅ Supports optional parameters, automatically converts to GraphQL optional parameters
- ✅ Supports array parameters, automatically infers as list types
- ✅ IDE hints complete, types automatically derived from Schema definitions

**Conclusion**: Parameter types completely automatically inferred, no manual declarations needed, IDE hints complete. Supports chained API or function parameter automatic inference, types automatically derived from Schema definitions.

#### 3.4 Input Validation Mechanism

**Score: 3.0**

**Evidence**:
- **Decorator validation**: Uses `createDecorator` to implement validation (lines 3-68 of `packages/pylon/src/create-decorator.ts`)
- **Validation logic separated**: Validation logic separated from business logic, code is clear (lines 129-168 of `typescript-graphql-schemas/pylon/src/index.ts`)
- **Requires manual validation logic**: All validation logic requires manual implementation (lines 129-168)

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Define validation decorator
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// Use validation decorator
createUser: validateEmail((name: string, email: string): User => {
  // Validation logic executed in decorator
  const id = incrementId()
  return new User(id, name, email)
})
```

**Core Implementation** (`packages/pylon/src/create-decorator.ts`):
- Lines 3-68: `createDecorator` function implements validation decorator
- Lines 24-27: Decorator executes validation logic before function execution
- Lines 35-40: Supports function decorator pattern

**Validation Example**:
```typescript
// Complex validation logic
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

**Shortcomings**:
- ⚠️ **No built-in validation**: Does not support declarative validation (e.g., `z.email()`), requires manual validation logic
- ⚠️ **Validation code duplication**: Each validation logic requires manual implementation, validation code may be duplicated
- ⚠️ **No format validation**: Does not support format validation (e.g., email format, URL format, etc.), requires manual implementation

**Analysis**:
- ✅ Validation logic separated from business logic, code is clear
- ✅ Uses decorator pattern, easy to reuse
- ⚠️ Requires manual validation logic, does not support declarative validation
- ⚠️ Validation code may be duplicated, no built-in validation library integration

**Conclusion**: Supports validation, but requires manual validation logic. Requires manual validation function calls, validation code mixed with business logic. All validation logic needs to be manually written in Resolvers, validation code duplicated.

#### 3.5 Batch Loading (DataLoader) Integration

**Score: <-待评分->**

**Evidence**:
- **Requires manual DataLoader creation**: DataLoader requires manual creation and configuration (lines 174-213 of `typescript-graphql-schemas/pylon/src/index.ts`)
- **Requires manual Context setup**: Need to manually set loaders in middleware (lines 222-225)
- **Requires manual calls**: Need to manually call loaders in Field Resolvers (lines 96-122)

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// 1. Manually create DataLoader
export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      // Batch loading logic
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

// 2. Manually set Context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

// 3. Manually call DataLoader
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**Analysis**:
- ⚠️ **Requires manual DataLoader instance creation**: Each DataLoader requires manual creation and configuration
- ⚠️ **Requires manual Context type definition**: Need to manually define Context types in `pylon.d.ts` (`typescript-graphql-schemas/pylon/pylon.d.ts`)
- ⚠️ **Requires manual Context setup**: Need to manually set loaders in middleware
- ⚠️ **Requires manual calls**: Need to manually call loaders in Field Resolvers
- ⚠️ **Lots of boilerplate**: Requires significant boilerplate to integrate DataLoader

**Conclusion**: Provides no built-in dataloader support, requires significant context boilerplate and dataloader boilerplate. Requires manual DataLoader instance creation, Context type definition, Context injection configuration, lots of boilerplate.

### Resolvers & Validation Overall Score

**Score: 2.5**

**Scoring Basis**:
- Developer experience: 4.5 (Clean code, but DataLoader requires manual integration)
- Modular design: 0.0 (No modularity consideration, completely organized by operation type)
- Parameter definition & type inference: 5.0 (Parameter types completely automatically inferred)
- Input validation mechanism: 3.0 (Supports validation, but requires manual validation logic)
- Batch loading (DataLoader) integration: 0.0 (No built-in support, requires significant boilerplate)

**Advantages**:
1. **Extremely concise code**: Functional definition, almost no boilerplate
2. **Automatic type inference**: Parameter types and return types completely automatically inferred
3. **Validation decorator**: Uses `createDecorator` to implement validation, code is clear
4. **Field Resolver concise**: Implemented through class async methods, code is intuitive

**Disadvantages**:
1. **No modularity support**: Completely organized by operation type, easy to write coupled giant files
2. **Validation requires manual implementation**: Does not support declarative validation, requires manual validation logic
3. **DataLoader requires manual integration**: Requires significant boilerplate to integrate DataLoader
4. **Context requires manual configuration**: Requires manual Context setup and type definitions

## 4. Built-in Features

### Feature Support Overview

Pylon provides some built-in features through deep integration with Hono and GraphQL Yoga, while supporting extended features through Envelop plugin system. Core features include Context injection, Middleware support, custom scalars, Subscriptions, etc., but DataLoader, Directives, query complexity analysis and other features require manual implementation or implementation through plugins.

### Feature Support Details

| Feature                       | Support Status     | Description                                                                                |
| :---------------------------- | :----------------- | :----------------------------------------------------------------------------------------- |
| **Directives**                | ⚠️ Plugin/Extra     | Not built-in, but can be implemented through Envelop plugins, requires extra configuration |
| **Extensions**                | ⚠️ Plugin/Extra     | Not built-in, but can be implemented through Envelop plugins, requires extra configuration |
| **DataLoader**                | ⛔ Cannot implement | Provides no built-in dataloader support, requires manual creation and configuration        |
| **Custom Scalars**            | ✅ Built-in         | Built-in common scalar types like Date, JSON, Object, Void, Number                         |
| **Subscription**              | ✅ Built-in         | Native GraphQL Subscriptions support, implemented through `experimentalCreatePubSub`       |
| **Context Injection**         | ✅ Built-in         | Native support for injecting context in Resolvers, implemented through `getContext()`      |
| **Middleware**                | ✅ Built-in         | Native Hono middleware support, can inject logic before/after Resolver execution           |
| **Query Complexity Analysis** | ⚠️ Plugin/Extra     | Not built-in, but can be implemented through Envelop plugins, requires extra configuration |
| **Depth Limiting**            | ⚠️ Plugin/Extra     | Not built-in, but can be implemented through Envelop plugins, requires extra configuration |

### Detailed Feature Analysis

#### 4.1 Directives Support

**Support Status: ⚠️ Plugin/Extra Implementation**

**Evidence**:
- **No built-in support**: No Directives-related implementation found in `packages/pylon/src`
- **Can be implemented through Envelop plugins**: `packages/pylon/src/app/handler/pylon-handler.ts` (line 152) supports adding Envelop plugins through `config.plugins`
- **Requires extra configuration**: Need to manually install and configure Envelop Directives plugin

**Implementation Method**:
```typescript
// Implement Directives through Envelop plugins
import { useSchema } from '@envelop/core'
import { useDirective } from '@envelop/directives'

export const config: PylonConfig = {
  plugins: [
    useDirective({
      // Directives configuration
    })
  ]
}
```

**Conclusion**: Not built-in, but can be implemented through official plugins, community plugins, or manual implementation, requires extra configuration and boilerplate.

#### 4.2 Extensions Support

**Support Status: ⚠️ Plugin/Extra Implementation**

**Evidence**:
- **No built-in support**: No Extensions-related implementation found in `packages/pylon/src`
- **Can be implemented through Envelop plugins**: Supports adding Envelop plugins through `config.plugins` (line 152 of `packages/pylon/src/app/handler/pylon-handler.ts`)
- **ServiceError supports extensions**: `packages/pylon/src/define-pylon.ts` (lines 349-367) `ServiceError` class supports `extensions` field

**Implementation Method**:
```typescript
// Implement Extensions through Envelop plugins
import { useExtendContext } from '@envelop/core'

export const config: PylonConfig = {
  plugins: [
    useExtendContext(async (context) => {
      return {
        // Extension information
      }
    })
  ]
}
```

**Conclusion**: Not built-in, but can be implemented through plugins or manual Context extension to achieve similar functionality, requires extra configuration.

#### 4.3 DataLoader Integration

**Support Status: ⛔ Cannot Implement**

**Evidence**:
- **No built-in support**: No DataLoader-related built-in implementation found in `packages/pylon/src`
- **Requires manual creation**: `typescript-graphql-schemas/pylon/src/index.ts` (lines 174-213) requires manual DataLoader instance creation
- **Requires manual Context setup**: Need to manually set loaders in middleware (lines 222-225)
- **Requires manual calls**: Need to manually call loaders in Field Resolvers (lines 96-122)

**Actual Usage**:
```typescript
// 1. Manually create DataLoader
export const createLoaders = () => {
  return {
    userOrders: new DataLoader<number, Order[]>(async (userIds) => {
      // Batch loading logic
    }),
  }
}

// 2. Manually set Context
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})

// 3. Manually call DataLoader
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}
```

**Conclusion**: Provides no built-in dataloader support, and cannot be implemented through plugins, requires significant context boilerplate and dataloader boilerplate.

#### 4.4 Custom Scalars

**Support Status: ✅ Built-in**

**Evidence**:
- **Built-in common scalars**: `packages/pylon/src/app/handler/pylon-handler.ts` (lines 68-104) built-in Date, JSON, Object, Void, Number and other scalar types
- **Uses graphql-scalars**: Lines 2-7 import scalar types from `graphql-scalars` library
- **Custom Number scalar**: Lines 73-104 define custom `Number` scalar, supports integers and floats

**Built-in Scalar Types**:
```typescript
// packages/pylon/src/app/handler/pylon-handler.ts:68-104
resolvers: {
  Date: DateTimeISOResolver,      // DateTime scalar
  JSON: JSONResolver,              // JSON scalar
  Object: JSONObjectResolver,      // Object scalar
  Void: GraphQLVoid,               // Void scalar
  Number: new GraphQLScalarType({  // Custom number scalar
    name: 'Number',
    description: 'Custom scalar that handles both integers and floats',
    parseValue(value) { ... },
    parseLiteral(ast) { ... },
    serialize(value) { ... }
  })
}
```

**Conclusion**: Built-in common scalar types (such as `DateTime`, `JSON`, `BigInt`, `Date`, etc.), defining new scalar types is simple, API is intuitive and type-safe.

#### 4.5 Subscription

**Support Status: ✅ Built-in**

**Evidence**:
- **Native support**: `packages/pylon/src/index.ts` (line 19) exports `experimentalCreatePubSub`
- **Official example**: `examples/nodejs-subscriptions/src/index.ts` demonstrates Subscription usage
- **GraphQL Yoga support**: Uses GraphQL Yoga under the hood, natively supports Subscriptions

**Actual Usage** (`examples/nodejs-subscriptions/src/index.ts`):
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

**Core Implementation**:
- `packages/pylon/src/index.ts` (line 19): Exports `experimentalCreatePubSub`, from `graphql-yoga`
- `packages/pylon/src/define-pylon.ts` (lines 306-320): Supports Subscription Resolver transformation

**Conclusion**: Native GraphQL Subscriptions support, supports real-time data push, underlying transport protocol has good compatibility (WebSocket, SSE, etc.), API is concise.

#### 4.6 Context Injection

**Support Status: ✅ Built-in**

**Evidence**:
- **Native support**: `packages/pylon/src/context.ts` (lines 29-51) implements `asyncContext` and `getContext()`
- **Type inference complete**: `packages/pylon/src/context.ts` (lines 9-27) defines `Context` type, type inference is complete
- **Good IDE hints**: Gets context through `getContext()`, type-safe

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Get Context
export class User {
  async orders(): Promise<Order[]> {
    const loaders = getContext().get('loaders')
    return loaders.userOrders.load(this.id)
  }
}

// Set Context (through Hono middleware)
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**Core Implementation** (`packages/pylon/src/context.ts`):
- Line 29: `asyncContext` uses `AsyncLocalStorage` to implement context storage
- Lines 31-47: `getContext()` function gets current context
- Lines 49-51: `setContext()` function sets context

**Conclusion**: Native support for injecting context in Resolvers, context type inference is complete, IDE hints are good, no manual type declarations needed.

#### 4.7 Middleware

**Support Status: ✅ Built-in**

**Evidence**:
- **Hono middleware**: `packages/pylon/src/app/index.ts` (line 6) `app` is a Hono instance, supports all Hono middleware
- **Built-in middleware**: Line 8 uses Sentry middleware, lines 10-20 use AsyncLocalStorage middleware
- **Supports chained calls**: Can chain multiple middleware

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Use Hono middleware
app.use('*', async (c, next) => {
  c.set('loaders', createLoaders())
  await next()
})
```

**Core Implementation** (`packages/pylon/src/app/index.ts`):
- Line 6: `app` is a Hono instance
- Line 8: Built-in Sentry middleware
- Lines 10-20: AsyncLocalStorage middleware, for context management
- Lines 22-26: Request ID middleware

**Conclusion**: Native support for injecting middleware logic before/after Resolver execution (such as logging, permission checks, performance monitoring), API is concise, supports chained calls.

#### 4.8 Query Complexity Analysis

**Support Status: ⚠️ Plugin/Extra Implementation**

**Evidence**:
- **No built-in support**: No query complexity analysis-related implementation found in `packages/pylon/src`
- **Can be implemented through Envelop plugins**: Supports adding Envelop plugins through `config.plugins` (line 152 of `packages/pylon/src/app/handler/pylon-handler.ts`)

**Implementation Method**:
```typescript
// Implement query complexity analysis through Envelop plugins
import { useQueryComplexity } from '@envelop/query-complexity'

export const config: PylonConfig = {
  plugins: [
    useQueryComplexity({
      // Complexity configuration
    })
  ]
}
```

**Conclusion**: Not built-in, but can be implemented through plugins or manual complexity analysis, requires extra configuration and custom logic.

#### 4.9 Depth Limiting

**Support Status: ⚠️ Plugin/Extra Implementation**

**Evidence**:
- **No built-in support**: No depth limiting-related implementation found in `packages/pylon/src`
- **Can be implemented through Envelop plugins**: Supports adding Envelop plugins through `config.plugins` (line 152 of `packages/pylon/src/app/handler/pylon-handler.ts`)

**Implementation Method**:
```typescript
// Implement depth limiting through Envelop plugins
import { useDepthLimit } from '@envelop/depth-limit'

export const config: PylonConfig = {
  plugins: [
    useDepthLimit({
      maxDepth: 10
    })
  ]
}
```

**Conclusion**: Not built-in, but can be implemented through plugins or manual depth limiting, requires extra configuration.

### Built-in Features Overall Score

**Score: 3.1**

**Scoring Basis**:
- Directives: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- Extensions: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- DataLoader: ⛔ Cannot implement (0 points) - Provides no built-in dataloader support
- Scalars: ✅ Built-in (5 points) - Built-in Date, JSON, Object, Void, Number and other common scalar types
- Subscription: ✅ Built-in (5 points) - Native support, implemented through `experimentalCreatePubSub`
- Context: ✅ Built-in (5 points) - Native support, implemented through `getContext()`
- Middleware: ✅ Built-in (5 points) - Native Hono middleware support, can inject logic before/after Resolver execution
- Query Complexity: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- Depth Limiting: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins

**Total: 28/45 = 3.1/5.0**

**Scoring Basis**:
- Directives support: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- Extensions support: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- DataLoader: ⛔ Cannot implement (0 points) - Provides no built-in dataloader support
- Custom scalars: ✅ Built-in (5 points) - Built-in Date, JSON, Object, Void, Number and other common scalar types
- Subscription: ✅ Built-in (5 points) - Native support, implemented through `experimentalCreatePubSub`
- Context injection: ✅ Built-in (5 points) - Native support, implemented through `getContext()`
- Middleware: ✅ Built-in (5 points) - Native Hono middleware support, can inject logic before/after Resolver execution
- Query complexity analysis: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins
- Depth limiting: ⚠️ Plugin/Extra (2 points) - Not built-in, but can be implemented through Envelop plugins

**Advantages**:
1. **Context injection complete**: Native context injection support, type inference complete
2. **Middleware support**: Through Hono middleware support, powerful functionality
3. **Rich custom scalars**: Built-in common scalar types
4. **Subscriptions support**: Native GraphQL Subscriptions support

**Disadvantages**:
1. **No built-in DataLoader support**: Requires manual creation and configuration, lots of boilerplate
2. **No built-in Directives support**: Needs to be implemented through Envelop plugins
3. **No built-in query complexity analysis**: Needs to be implemented through Envelop plugins
4. **No built-in depth limiting**: Needs to be implemented through Envelop plugins

## 5. Ecosystem Integration

### Ecosystem Integration Overview

Pylon provides good runtime compatibility through deep integration with Hono and GraphQL Yoga, supporting multiple runtimes (Node.js, Bun, Deno, Cloudflare Workers). For ORM integration, officially recommends Prisma and provides `@getcronit/prisma-extended-models` package to enhance integration. But for validation library integration, requires manual validation logic implementation, does not support automatic integration with mainstream validation libraries.

### Scoring Details

#### 5.1 ORM Integration Depth

**Score: <-待评分->**

**Evidence**:
- **Supports Prisma**: Official documentation (`docs/pages/docs/integrations/databases.mdx`) recommends Prisma, provides detailed integration guide
- **Supports Drizzle**: Official example (`examples/cloudflare-drizzle-d1`) demonstrates Drizzle ORM integration
- **prisma-extended-models package**: Provides `@getcronit/prisma-extended-models` package to enhance Prisma integration (lines 51-135 of `docs/pages/docs/integrations/databases.mdx`)
- **Requires manual integration**: Requires manual Prisma Client instance creation, requires manual query logic

**Actual Usage** (`examples/cloudflare-drizzle-d1/src/index.ts`):
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

**Prisma Integration Example** (`docs/pages/docs/integrations/databases.mdx`):
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

**prisma-extended-models package**:
- Provides `bunx prisma-extended-models generate` command to generate extended models
- Automatically resolves relations and creates paginatable connections
- Requires extra installation and configuration

**Shortcomings**:
- ⚠️ **Requires manual integration**: Requires manual ORM client instance creation, requires manual query logic
- ⚠️ **Type synchronization requires manual maintenance**: Although Prisma has type generation, need to manually ensure type synchronization
- ⚠️ **Relation resolution requires extra configuration**: Using `prisma-extended-models` requires extra installation and configuration

**Analysis**:
- ✅ Supports mainstream ORMs (Prisma, Drizzle)
- ✅ Official provides integration guides and examples
- ✅ Provides `prisma-extended-models` package to enhance integration
- ⚠️ Requires manual integration, not zero boilerplate
- ⚠️ Type synchronization requires manual maintenance

**Conclusion**: Basic integration. Supports ORM integration through plugins or manual methods, can reuse some model definitions, but requires more configuration and boilerplate.

#### 5.2 Validation Library Integration

**Score: <-待评分->**

**Evidence**:
- **No validation library integration**: No integration of Zod, Valibot, Yup and other validation libraries found in `packages/pylon/src`
- **Requires manual validation implementation**: Validation manually implemented through `createDecorator` (`packages/pylon/src/create-decorator.ts`)
- **Validation logic separated from Schema definition**: Validation logic requires manual writing, cannot automatically derive types from validation rules

**Actual Usage** (`typescript-graphql-schemas/pylon/src/index.ts`):
```typescript
// Requires manual validation logic implementation
const validateEmail = createDecorator(async (name: string, email: string) => {
  if (!email || !email.includes('@')) {
    throw new ServiceError('Invalid email format', {
      code: 'INVALID_EMAIL',
      statusCode: 400,
    })
  }
})

// Use validation decorator
createUser: validateEmail((name: string, email: string): User => {
  // Business logic
})
```

**Analysis**:
- ⚠️ **No validation library integration**: Completely does not support mainstream validation libraries (Zod, Valibot, Yup, etc.)
- ⚠️ **Validation logic separated from Schema definition**: Validation logic requires manual writing, cannot automatically derive types from validation rules
- ⚠️ **Requires significant boilerplate**: Each validation logic requires manual implementation, validation code may be duplicated

**Conclusion**: No integration. Completely does not support validation library integration, must manually write all validation logic.

#### 5.3 GraphQL Server Compatibility

**Score: <-待评分->**

**Evidence**:
- **Binds GraphQL Yoga**: `packages/pylon/src/app/handler/pylon-handler.ts` (line 8) uses `createYoga` to create GraphQL Server
- **Cannot replace Server**: Core implementation depends on GraphQL Yoga, cannot integrate into other GraphQL Servers (e.g., Apollo Server)
- **Supports Envelop plugins**: Line 152 supports adding Envelop plugins through `config.plugins`, but underlying is still GraphQL Yoga

**Core Implementation** (`packages/pylon/src/app/handler/pylon-handler.ts`):
```typescript
// Lines 131-155: Must use GraphQL Yoga
const yoga = createYoga({
  landingPage: false,
  graphqlEndpoint: '/graphql',
  ...config,
  graphiql: async () => resolveGraphiql(config),
  plugins: [
    useSentry(),
    useDisableIntrospection({ ... }),
    useViewer({ ... }),
    ...(config?.plugins || [])  // Supports Envelop plugins
  ],
  schema
})
```

**Analysis**:
- ⚠️ **Forced binding to GraphQL Yoga**: Core implementation depends on GraphQL Yoga, cannot replace
- ⚠️ **Cannot integrate into other Servers**: Although supports Envelop plugins, underlying is still GraphQL Yoga
- ✅ **Envelop plugin support**: Supports extending functionality through Envelop plugins

**Conclusion**: Binds to specific Server. Forced binding to specific GraphQL Server (GraphQL Yoga), cannot integrate into other Servers.

#### 5.4 Toolchain Integration

**Score: <-待评分->**

##### TypeScript/JavaScript Support

**TypeScript Support**:
- **✅ Core language**: All official templates and examples use TypeScript (`.ts` files)
  - `packages/create-pylon/templates/node/default/src/index.ts`
  - `packages/create-pylon/templates/bun/default/src/index.ts`
  - `packages/create-pylon/templates/cf-workers/default/src/index.ts`
  - `packages/create-pylon/templates/deno/default/src/index.ts`
- **✅ TypeScript configuration**: Provides official TypeScript configuration template `tsconfig.pylon.json`
  - `packages/pylon/tsconfig.pylon.json` (lines 1-24) contains complete TypeScript configuration
  - All template projects inherit this configuration (line 2 of `packages/create-pylon/templates/shared/tsconfig.json`)

**JavaScript Support**:
- **⚠️ Partial support**: `tsconfig.pylon.json` sets `allowJs: true` (line 13), allows importing `.js` files from TypeScript
- **⚠️ But no pure JavaScript examples**:
  - All official templates and examples are TypeScript files
  - Build tool (`pylon-builder`) uses `esbuild`'s `loader: 'ts'` (line 64 of `packages/pylon-builder/src/bundler/bundler.ts`), mainly processes TypeScript
  - Documentation and examples do not provide pure JavaScript usage guide

**Code Evidence**:

`packages/pylon/tsconfig.pylon.json` (lines 12-13):
```json
"jsx": "react-jsx", // support JSX
"allowJs": true, // allow importing `.js` from `.ts`
```

`packages/pylon-builder/src/bundler/bundler.ts` (lines 63-64):
```typescript
return {
  loader: 'ts',
  contents: contents + `...`
}
```

##### Runtime Environment Support

**Node.js**:
- **✅ Explicit support**: Provides official Node.js templates and examples
  - `packages/create-pylon/templates/node/default/` provides complete Node.js template
  - `examples/nodejs-subscriptions/package.json` (line 13) uses `@hono/node-server` to adapt Node.js
  - `examples/nodejs-subscriptions/package.json` (line 8) dev command: `"dev": "pylon dev -c \"node --enable-source-maps .pylon/index.js\""`

**Bun**:
- **✅ Explicit support**: Provides official Bun templates and examples
  - `packages/create-pylon/templates/bun/default/` provides complete Bun template
  - `examples/bun-testing/package.json` (line 8) dev command: `"dev": "pylon dev -c 'bun run .pylon/index.js'"`
  - `README.md` (lines 171-173) explicitly lists Bun as supported runtime

**Deno**:
- **✅ Explicit support**: Provides official Deno template
  - `packages/create-pylon/templates/deno/default/` provides complete Deno template
  - `packages/create-pylon/templates/deno/default/deno.json` (line 7) dev command: `"dev": "pylon dev -c 'deno run -A .pylon/index.js --config tsconfig.json'"`
  - `packages/create-pylon/templates/deno/default/src/index.ts` (lines 12-17) uses `Deno.serve()` to start service

**Cloudflare Workers**:
- **✅ Explicit support**: Provides official Cloudflare Workers templates and examples
  - `packages/create-pylon/templates/cf-workers/default/` provides complete Cloudflare Workers template
  - `examples/cloudflare-drizzle-d1/package.json` (line 6) deploy command: `"deploy": "pylon build && wrangler deploy"`
  - `README.md` (line 155) explicitly states "Pylon is fully compatible with Cloudflare Workers"

**Browser**:
- **❌ Not supported**: Pylon is a server-side GraphQL framework, cannot run in browser environment
  - Core implementation depends on Hono (line 2 of `packages/pylon/src/app/index.ts`), which is a server-side Web framework
  - Depends on GraphQL Yoga (line 33 of `packages/pylon/package.json`), which is a server-side GraphQL Server
  - All examples and templates are server-side code, no browser running examples or documentation

**Code Evidence**:

`packages/create-pylon/templates/node/default/src/index.ts` (lines 1-15):
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

`packages/create-pylon/templates/deno/default/src/index.ts` (lines 12-17):
```typescript
Deno.serve(
  {
    port: 3000
  },
  app.fetch
)
```

##### Build Tool Support

**esbuild**:
- **✅ Core build tool**: Pylon's build system is completely based on esbuild
  - `packages/pylon-builder/src/bundler/bundler.ts` (line 4) imports `esbuild`
  - `packages/pylon-builder/src/bundler/bundler.ts` (lines 94-109) uses `esbuild.build()` for building
  - `packages/pylon-builder/package.json` (line 25) depends on `"esbuild": "^0.23.1"`
  - Users must use `pylon build` or `pylon dev` commands, these commands internally use esbuild

**Webpack**:
- **⚠️ No official configuration examples**:
  - Documentation and examples do not provide webpack configuration examples
  - User projects cannot directly use webpack to build Pylon server code
  - Must use `pylon build` command to generate build artifacts, then can manually integrate into webpack workflow

**Vite**:
- **⚠️ No official configuration examples**:
  - Documentation and examples do not provide vite configuration examples
  - The vite project in `examples/cloudflare-pages-worker-monorepo/apps/vite-project/` is a client project, not the Pylon server itself
  - User projects cannot directly use vite to build Pylon server code
  - Must use `pylon build` command to generate build artifacts

**Rspack**:
- **⚠️ No official configuration examples**:
  - Documentation and examples do not provide rspack configuration examples
  - No rspack-related configuration files or documentation
  - User projects cannot directly use rspack to build Pylon server code

**Build Flow Limitations**:
- **⚠️ Must use Pylon CLI**: Users must use `pylon build` or `pylon dev` commands
  - `packages/pylon-dev/src/index.ts` (lines 19-37) implements `build` command
  - `packages/pylon-dev/src/index.ts` (lines 40-278) implements `dev` command
  - These commands internally call `@getcronit/pylon-builder` for building
  - Cannot bypass Pylon CLI to directly use other build tools

**Code Evidence**:

`packages/pylon-builder/src/bundler/bundler.ts` (lines 94-109):
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

`packages/pylon-dev/src/index.ts` (lines 19-37):
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

**Analysis**:
- ✅ **TypeScript support complete**: All official templates and examples use TypeScript, provides complete TypeScript configuration
- ⚠️ **JavaScript support limited**: Although allows importing JavaScript files, no pure JavaScript examples, build tool mainly processes TypeScript
- ✅ **Multi-runtime support good**: Explicitly supports Node.js, Bun, Deno, Cloudflare Workers, provides official templates and examples
- ❌ **Browser not supported**: Pylon is a server-side framework, cannot run in browser environment
- ✅ **esbuild as core build tool**: Build system completely based on esbuild
- ⚠️ **Other build tool support limited**: No official configuration examples for webpack, vite, rspack, users must use Pylon CLI for building

**Conclusion**: Basic support. Mainly supports TypeScript, can run on some mainstream runtimes, supports some build tools, but requires specific configuration, limited flexibility.

### Ecosystem Integration Overall Score

**Score: 1.0**

**Scoring Basis**:
- ORM integration depth: 3.0 (Basic integration, supports Prisma and Drizzle, but requires manual integration)
- Validation library integration: 1.0 (No integration, requires manual validation logic implementation)
- GraphQL Server compatibility: 1.0 (Binds GraphQL Yoga, cannot replace)
- Toolchain integration: 1.0 (Mainly supports TypeScript, can run on some mainstream runtimes, supports some build tools, but requires specific configuration, limited flexibility, strong Hono binding)

**Advantages**:
1. **Good ORM support**: Officially recommends Prisma, provides integration guides and `prisma-extended-models` package
2. **Multi-runtime support**: Explicitly supports Node.js, Bun, Deno, Cloudflare Workers, provides official templates and examples
3. **Envelop plugin support**: Supports extending functionality through Envelop plugins
4. **TypeScript support complete**: All official templates and examples use TypeScript, provides complete TypeScript configuration

**Disadvantages**:
1. **No validation library integration**: Completely does not support mainstream validation libraries, requires manual validation logic implementation
2. **Severe framework binding**: Forced binding to Hono and GraphQL Yoga, cannot replace
3. **ORM integration requires manual configuration**: Although supports ORM, requires manual integration and configuration, not zero boilerplate
4. **Build tool flexibility limited**: Must use Pylon CLI and esbuild, no official configuration examples for webpack, vite, rspack
5. **Browser not supported**: Pylon is a server-side framework, cannot run in browser environment

## 📝 Summary

### Overall Score: 2.6/5.0

| Dimension              | Score | Description                                                                                       |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| Architecture           | 2.5   | Inference mode, requires build, deeply integrated with Hono                                       |
| Type Definition        | 3.75  | Deep inference, zero-config enums, smart interface detection, powerful type inference             |
| Resolvers & Validation | 2.5   | Clean code, automatic type inference, but validation and DataLoader require manual implementation |
| Built-in Features      | 3.1   | Context/Middleware/Subscriptions well-implemented, no built-in DataLoader support                 |
| Ecosystem Integration  | 1.0   | Basic ORM integration, no validation library integration, severe framework binding                |

### Overall Evaluation

Pylon adopts Inference (automatic inference) mode, uses TypeScript Compiler API to statically analyze source code, automatically infers and generates GraphQL Schema from TypeScript type definitions and Resolver function signatures. Achieves automatic type inference, zero-config enums, smart interface detection. But requires build, cannot run directly, deeply bound to Hono and GraphQL Yoga, framework flexibility is limited. No validation library integration, DataLoader requires manual implementation.

### Core Advantages

1. **Automatic type inference**: Automatically generates GraphQL Schema from TypeScript types, reduces manual definitions
2. **Zero-config enums**: String union types automatically convert to GraphQL enums, completely zero-config
3. **Smart interface detection**: Automatically detects common fields in Union types and generates interfaces
4. **Context/Middleware/Subscriptions complete**: Native support, type inference complete
5. **Multi-runtime support**: Supports Node.js, Bun, Deno, Cloudflare Workers

### Main Disadvantages

1. **Must build**: Cannot run directly, must execute build command to generate Schema first
2. **Severe framework binding**: Forced binding to Hono and GraphQL Yoga, cannot replace underlying framework
3. **No modularity support**: Completely organized by operation type, easy to write coupled giant files
4. **No validation library integration**: Completely does not support mainstream validation libraries, requires manual validation logic implementation
5. **No DataLoader support**: Requires manual implementation, requires significant boilerplate
6. **Many dependencies**: Runtime dependencies include complete GraphQL Server and Web framework

### Use Cases

#### Recommended Use

- Projects using Hono as Web framework
- Projects requiring automatic type inference
- Projects requiring multi-runtime deployment (Node.js, Bun, Deno, Cloudflare Workers)
- Projects not minding build steps

#### Not Recommended Use

- Projects requiring write-and-run
- Projects requiring modularity
- Projects requiring validation or DataLoader
- Projects requiring underlying framework replacement
- Projects requiring minimal dependencies

### Improvement Suggestions

1. **Provide modularity support**: Support organizing code by domain, enforce module boundaries
2. **Provide validation and DataLoader support**: Reduce manual implementation, improve development efficiency
3. **Reduce framework binding**: Improve flexibility, support underlying framework replacement
4. **Support runtime build**: Provide optional runtime build mode, reduce build step dependency
