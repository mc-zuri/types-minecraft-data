import type { ProtoDefinition } from "./protodef.js";
import { protoDefBasicToType } from "./primitive.ts";
import { protoDefBitfield, protoDefBitflags, protoDefMapper } from "./flags.ts";
import { type Ctx } from "./ctx.ts";
import { protoDefSwitch } from "./conditional.ts";
import { protoDefArray, protoDefContainer } from "./structures.ts";
import { mcCustomTypes, mcDataCustomProtoDefs, protoDefRegistryEntryHolder, protoDefRegistryEntryHolderSet } from "./mcdata.ts";
import { TSType } from "../ts/tstype.ts";


function resolvePath(path: string[], compareTo: string): string {
    const parts = compareTo.split("/");
    let cursor = [...path];

    for (const part of parts) {
        if (part === "..") {
            cursor.pop();
        } else if (part === ".") {
            continue;
        } else {
            cursor.push(part);
        }
    }

    return cursor.join(".");
}

export const protoDefToType = (
    type: ProtoDefinition.Type,
    ctx: Ctx,
): TSType => {
    // Check builtin types first (string types)
    if (typeof type == "string") {
        if (mcDataCustomProtoDefs[type]) {
            return mcDataCustomProtoDefs[type];
        }

        // Try to resolve as a custom type in the protocol
        let newType = ctx.resolveType(type);
        if (newType) return TSType.Reference(newType);

        // Unknown type
        return TSType.Reference(`\`$${type}\``);
    }

    // Handle tuple types like ["buffer", args]
    let native = protoDefBasicToType(type);
    if (native) return native;

    const [typeName, args] = type;

    if (typeName == "count") {
        // Count is a wrapper that indicates this field's value is used to determine array length
        // Extract the underlying type (e.g., i16, i32)
        return protoDefToType((args as any).type, ctx);
    }
    if (typeName == "encapsulated") {
        // Encapsulated is a wrapper for serialization - extract the inner type
        return protoDefToType((args as any).type, ctx);
    }

    if(mcCustomTypes.includes(typeName)){
        const resolvedType = ctx.resolveType(typeName);
        if (resolvedType) return TSType.Reference(resolvedType);
        return TSType.Reference(typeName);
    }

    if (typeName == "enum_size_based_on_values_len") {
        // Reference the enum_size_based_on_values_len type by name
        const resolvedType = ctx.resolveType("enum_size_based_on_values_len");
        if (resolvedType) return TSType.Reference(resolvedType);
        return TSType.Reference("enum_size_based_on_values_len");
    }
    if (typeName == "option") return TSType.Union([
        protoDefToType(args as ProtoDefinition.Type, ctx),
        TSType.Reference("undefined"),
    ]);
    if (typeName == "array") return protoDefArray(args, ctx);
    if (typeName === "switch") return protoDefSwitch(args, ctx);
    if (typeName === "container") return protoDefContainer(args, ctx);
    if (typeName == "bitfield") return protoDefBitfield(args);
    if (typeName == "bitflags") return protoDefBitflags(args);
    if (typeName == "mapper") return protoDefMapper(args);

    // mc-proto specific
    if (typeName == "registryEntryHolder") return protoDefRegistryEntryHolder(args, ctx);
    if (typeName == "registryEntryHolderSet") return protoDefRegistryEntryHolderSet(args, ctx);

    return TSType.Reference(`\`$$${typeName}\``);
};

