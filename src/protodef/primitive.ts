import { TSType } from "../ts/tstype.ts";
import type { ProtoDefinition } from "./protodef.js";

// 32-bit and smaller numeric types -> number
export const protoDefNumberTypes = [
    "i8",
    "u8",
    "i16",
    "u16",
    "i32",
    "u32",
    "f32",
    "f64",
    // Little-endian variants
    "li8",
    "lu8",
    "li16",
    "lu16",
    "li32",
    "lu32",
    "lf32",
    "lf64",
    // Variable-length integers
    "varint",
    "varint128",
    "zigzag32",
] as const;

// 64-bit integer types -> bigint
export const protoDefBigIntTypes = [
    "i64",
    "u64",
    "li64",
    "lu64",
    "varint64",
    "zigzag64",
] as const;

export const protoDefNumericTypes = [
    ...protoDefNumberTypes,
    ...protoDefBigIntTypes,
] as const;

export const protoDefNativeTypes = [
    ...protoDefNumericTypes,
    "switch",
    "option",
    "int",
    "array",
    "container",
    "count",
    "pstring",
    "buffer",
    "bitfield",
    "mapper",
    "bitflags",
    "bool",
    "cstring",
    "void",
    "string"
] as const;

export const protoDefBasicToType = (
    type: ProtoDefinition.Type
) => {
    // Handle tuple types like ["buffer", args], ["int", args], ["pstring", args]
    if (Array.isArray(type)) {
        const [typeName] = type;
        if (typeName == "buffer") return TSType.Reference("Buffer");
        if (typeName == "int") return TSType.Reference("number");
        if (typeName == "pstring") return TSType.Reference("string");
    }

    return null;
};

