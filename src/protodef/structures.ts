import { TSType } from "../ts/tstype.ts";
import type { Ctx } from "./ctx.ts";
import { protoDefToType } from "./index.ts";
import type { ProtoDefinition } from "./protodef.js";


export const protoDefArray = (args: ProtoDefinition.ArrayArgs, ctx: Ctx) => {
    return TSType.Array(protoDefToType(args.type, ctx));
};

export const protoDefContainer = (args: ProtoDefinition.ContainerArgs, ctx: Ctx) => {
    let record: Record<string, TSType> = {};

    for(let field of args) {
        record[field.name] = protoDefToType(field.type, ctx);
    }

    return TSType.Record(record);
};



