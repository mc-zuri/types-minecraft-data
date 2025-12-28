# @deniz-blue/types-minecraft-data

TypeScript type generator for Minecraft protocol data. Generates accurate TypeScript type definitions from [minecraft-data](https://github.com/PrismarineJS/minecraft-data) protocol definitions.

## Installation

### As a dependency

```bash
npm install @deniz-blue/types-minecraft-data
# or
pnpm add @deniz-blue/types-minecraft-data
# or
yarn add @deniz-blue/types-minecraft-data
```

### For development

```bash
git clone <repository-url>
cd types-minecraft-data
pnpm install
```

## Usage

### Generate types for specific version

After installing as a dependency, you can generate types using:

```bash
# Generate for specific platform and version
npx generate-mc-types pc 1.20
npx generate-mc-types bedrock 1.21.130

# Generate for all versions of a platform
npx generate-mc-types pc
npx generate-mc-types bedrock

# Generate for all platforms and versions
npx generate-mc-types
```

### Development scripts

When developing this package locally:

```bash
# Generate all types
npm start

# Generate for specific platform
npm run gen:pc
npm run gen:bedrock

# Generate for specific version
npm start pc 1.20
npm start bedrock 1.21.130
```

## Generated Types

Types are generated in the `gen/types/` directory with the following structure:

```typescript
// Example: gen/types/PC_1_20.d.ts
import { NBT } from "./nbt";

export namespace MCProtocol.PC_1_20.Types {
    export type Varlong = bigint;
    export type Position = { x: number; y: number; z: number };
    // ... other types
}

export namespace MCProtocol.PC_1_20.Play.Clientbound {
    export type PacketMapChunk = {
        x: number;
        z: number;
        // ... packet fields with JSDoc comments
    };
}
```

### Using generated types in your project

```typescript
import type { MCProtocol } from "@deniz-blue/types-minecraft-data/gen/types/PC_1_20";

// Use the types
const packet: MCProtocol.PC_1_20.Play.Clientbound.PacketMapChunk = {
    x: 0,
    z: 0,
    // ... other fields
};
```

## Features

- ✅ Generates TypeScript types from minecraft-data protocol definitions
- ✅ Supports both PC and Bedrock editions
- ✅ Handles conditional fields (switch statements) as optional fields with unions
- ✅ Extracts JSDoc comments from YAML protocol files
- ✅ Proper type mappings for primitives (number, bigint, string, Buffer, etc.)
- ✅ Automatic NBT type imports when needed
- ✅ Deduplicates union types
- ✅ Supports all Minecraft versions available in minecraft-data

## Type Mappings

| Protocol Type | TypeScript Type |
|--------------|-----------------|
| i8, u8, i16, u16, i32, u32, f32, f64, varint | `number` |
| i64, u64, varlong | `bigint` |
| string, pstring, uuid, UUID | `string` |
| bool | `boolean` |
| buffer, restBuffer, byte_array | `Buffer` |
| nbt, lnbt, compressedNbt | `any` |
| anonymousNbt, optionalNbt | `NBT.Root \| undefined` |
| switch (conditional) | Optional union types |

## License

MIT
