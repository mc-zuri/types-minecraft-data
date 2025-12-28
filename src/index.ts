import { mkdirSync, writeFileSync } from "node:fs";
import type { ProtoDefinition } from "./protodef/protodef.js";
import { getDataPaths, getJSON, mcDataPath } from "./data.ts";
import { replaceMap } from "./utils.ts";
import { protoDefToType } from "./protodef/index.ts";
import { protoDefNativeTypes } from "./protodef/primitive.ts";
import { mcDataCustomProtoDefs } from "./protodef/mcdata.ts";
import { camelCase, createCtx } from "./protodef/ctx.ts";
import { TSType, TSTypeToString } from "./ts/tstype.ts";
import { postprocess } from "./postprocess/post.ts";
import { lines, indent } from "./codegen.ts";

export type DtsNamespace = {
    namespace: string;
    types: Record<string, TSType>;
};

export const dtsToString = (list: DtsNamespace[]) => {
    return list.map(({ namespace, types }) => (
        lines([
            `export namespace ${namespace} {`,
            indent(Object.entries(types).map(([identifier, ts]) => (
                `export type ${identifier} = ${TSTypeToString(ts)};`
            ))),
            `}`,
        ])
    )).join("\n\n");
};

export const generateProtocolTypesFor = (
    rootNamespace: string,
    namespace: string,
    types: ProtoDefinition.Protocol["types"],
    protocolRoot: ProtoDefinition.Protocol,
): DtsNamespace => {
    let dts: DtsNamespace = {
        namespace,
        types: {},
    };

    for (let name in types) {
        if (protoDefNativeTypes.includes(name as any)) continue;
        const v = types[name]!;
        let ts = mcDataCustomProtoDefs[name] || protoDefToType(v, createCtx({
            protocolRoot,
            namespaceTypes: types,
            rootNamespace,
        }));

        ts = postprocess({
            node: ts,
        });

        dts.types[camelCase(name)] = ts;
    }

    return dts;
};

export const generateProtocolFor = (
    rootNamespace: string,
    namespace: string,
    data: ProtoDefinition.Protocol,
    root: ProtoDefinition.Protocol,
) => {
    let blocks: DtsNamespace[] = [];

    const typesOnly = Object.keys(data).length == 1 && !!data["types"];
    for (let ns in data) {
        const prettyNS = replaceMap(ns, {
            types: "Types",
            play: "Play",
            configuration: "Config",
            handshaking: "Handshake",
            status: "Status",
            login: "Login",
            toClient: "Clientbound",
            toServer: "Serverbound",
        });

        let child = namespace + "." + prettyNS;

        if (ns == "types") {
            blocks.push(generateProtocolTypesFor(rootNamespace, typesOnly ? namespace : child, data[ns], root));
        } else {
            blocks.push(...generateProtocolFor(rootNamespace, child, data[ns]!, root));
        }
    }

    return blocks;
};

export const pathIdToVersionNamespace = (pathId: string) => {
    const [type, version] = pathId.split("/");
    return `${type == "pc" ? "PC" : "Bedrock"}_${version?.replace(/\./g, "_")}`;
};

export const generateDefinitionsFor = (pathId: string) => {
    const namespace = "MCProtocol." + pathIdToVersionNamespace(pathId);

    const root = getJSON<ProtoDefinition.Protocol>(mcDataPath(pathId + "/protocol.json"));

    return generateProtocolFor(namespace, namespace, root, root);
};

export const generateDefinitions = () => {
    const paths = getDataPaths();

    let pcProtocolPathIds = new Set<string>();
    for (let v in paths.pc) {
        if (v.replace(/[0-9.]/g, "").length) continue;
        let info = paths.pc[v];
        let pathId = info?.protocol;
        if (pathId) pcProtocolPathIds.add(pathId);
    }

    for (let pathId of pcProtocolPathIds) {
        let dts = generateDefinitionsFor(pathId);
        // mkdirSync(`./gen/types`, { recursive: true });
        // writeFileSync(`./gen/types/${pathIdToVersionNamespace(pathId)}.d.ts`, dts);
    }
};

const main = () => {
    if (true) {
        let d = generateDefinitionsFor("bedrock/1.21.130");
        writeFileSync("./gen/test.d.ts", dtsToString(d));
        writeFileSync("./gen/test.json", JSON.stringify(d, null, 2));
    } else {
        generateDefinitions();
    }
};
main()
 