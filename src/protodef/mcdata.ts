import { TSType } from "../ts/tstype.ts";
import type { Ctx } from "./ctx.ts";
import { protoDefToType } from "./index.ts";
import type { ProtoDefinition } from "./protodef.js";

export const mcDataCustomProtoDefs: { [ty: string]: TSType } = {
    string: TSType.Reference("string"),
    restBuffer: TSType.Reference("Buffer"),
    anonymousNbt: TSType.Reference("NBT.Root"),
    anonOptionalNbt: TSType.Union([TSType.Reference("NBT.Root"), TSType.Reference("undefined")]),
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
