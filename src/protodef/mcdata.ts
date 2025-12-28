import { TSType } from "../ts/tstype.ts";
import type { Ctx } from "./ctx.ts";
import { protoDefToType } from "./index.ts";
import type { ProtoDefinition } from "./protodef.js";

export const mcCustomTypes = ['enum_size_based_on_values_len', 'compressedNbt' ,'anonymousNbt' ,'anonOptionalNbt' ,'OptionalNbt' ,'optionalNbt' ]

export const mcDataCustomProtoDefs: { [ty: string]: TSType } = {
    // Basic types
    string: TSType.Reference("string"),
    bool: TSType.Reference("boolean"),
    cstring: TSType.Reference("string"),
    void: TSType.Reference("undefined"),
    pstring: TSType.Reference("string"),

    // 32-bit and smaller numeric types -> number
    i8: TSType.Reference("number"),
    u8: TSType.Reference("number"),
    i16: TSType.Reference("number"),
    u16: TSType.Reference("number"),
    i32: TSType.Reference("number"),
    u32: TSType.Reference("number"),
    f32: TSType.Reference("number"),
    f64: TSType.Reference("number"),
    // Little-endian variants
    li8: TSType.Reference("number"),
    lu8: TSType.Reference("number"),
    li16: TSType.Reference("number"),
    lu16: TSType.Reference("number"),
    li32: TSType.Reference("number"),
    lu32: TSType.Reference("number"),
    lf32: TSType.Reference("number"),
    lf64: TSType.Reference("number"),
    // Variable-length integers
    varint: TSType.Reference("number"),
    varint128: TSType.Reference("number"),
    zigzag32: TSType.Reference("number"),

    // 64-bit integer types -> bigint
    i64: TSType.Reference("bigint"),
    u64: TSType.Reference("bigint"),
    li64: TSType.Reference("bigint"),
    lu64: TSType.Reference("bigint"),
    varint64: TSType.Reference("bigint"),
    zigzag64: TSType.Reference("bigint"),

    // Buffer types
    restBuffer: TSType.Reference("Buffer"),
    byte_array: TSType.Reference("Buffer"), // Old PC protocol versions

    // NBT types
    nbt: TSType.Reference("any"),
    lnbt: TSType.Reference("any"),
    nbtLoop: TSType.Reference("any"),
    compressedNbt: TSType.Reference("any"),
    anonymousNbt: TSType.Reference("NBT.Root"),
    anonOptionalNbt: TSType.Union([TSType.Reference("NBT.Root"), TSType.Reference("undefined")]),
    OptionalNbt: TSType.Union([TSType.Reference("NBT.Root"), TSType.Reference("undefined")]), // PC older versions
    optionalNbt: TSType.Union([TSType.Reference("NBT.Root"), TSType.Reference("undefined")]),

    // UUID and other identifiers
    uuid: TSType.Reference("string"),
    UUID: TSType.Reference("string"), // PC version uses uppercase
    ipAddress: TSType.Reference("string"), // Bedrock IP address type

    // Variable-length integers (PC-specific)
    varlong: TSType.Reference("bigint"),
    optvarint: TSType.Reference("number"),

    // Arrays and loops
    entityMetadataLoop: TSType.Reference("any[]"),
    topBitSetTerminatedArray: TSType.Reference("any[]"),

    // Rotation and other numerics
    byterot: TSType.Reference("number"),

    // Special types
    enum_size_based_on_values_len: TSType.Union([
        TSType.Reference('"byte"'),
        TSType.Reference('"short"'),
        TSType.Reference('"int"')
    ]), // Dynamic int size selector based on enum count
    MapInfo: TSType.Reference("any"),
    bitflags: TSType.Reference("unique symbol"),
    encapsulated: TSType.Reference("any"),
    native: TSType.Reference("unique symbol")
};

export const protoDefRegistryEntryHolder = (args: ProtoDefinition.RegistryEntryHolderArgs, ctx: Ctx) => {
    return TSType.Union([
        TSType.Record({
            [args.baseName]: TSType.Reference("number"),
        }),
        TSType.Record({
            [args.otherwise.name]: protoDefToType(args.otherwise.type, ctx),
        }),
    ]);
};

export const protoDefRegistryEntryHolderSet = (args: ProtoDefinition.RegistryEntryHolderSetArgs, ctx: Ctx) => {
    return TSType.Union([
        TSType.Record({
            [args.base.name]: protoDefToType(args.base.type, ctx),
        }),
        TSType.Record({
            [args.otherwise.name]: TSType.Array(protoDefToType(args.otherwise.type, ctx)),
        }),
    ]);
};
