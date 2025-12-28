#!/usr/bin/env node
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
import { loadProtocolComments, type CommentMap } from "./comments/extract.ts";
import path from "path";

export type DtsNamespace = {
    namespace: string;
    types: Record<string, TSType>;
};

// Convert PascalCase/camelCase to snake_case for YAML lookup
function toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export const dtsToString = (list: DtsNamespace[], commentMap: CommentMap = {}) => {
    // Generate the namespace content first
    const namespaceContent = list.map(({ namespace, types }) => (
        lines([
            `export namespace ${namespace} {`,
            indent(Object.entries(types).map(([identifier, ts]) => {
                const snakeCaseId = toSnakeCase(identifier);
                const comments = commentMap[snakeCaseId] || commentMap[identifier] || [];
                const jsdoc = comments.length > 0
                    ? `/**\n * ${comments.join('\n * ')}\n */\n`
                    : '';
                return `${jsdoc}export type ${identifier} = ${TSTypeToString(ts, commentMap, snakeCaseId)};`;
            })),
            `}`,
        ])
    )).join("\n\n");

    // Check if NBT is referenced anywhere in the output
    const usesNBT = namespaceContent.includes("NBT.Root") || namespaceContent.includes("NBT.");

    // Add imports at the top if needed
    const imports: string[] = [];
    if (usesNBT) {
        imports.push('import { NBT } from "./nbt";');
    }

    // Combine imports and content
    return imports.length > 0
        ? imports.join("\n") + "\n\n" + namespaceContent
        : namespaceContent;
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

    // Types that should not be exported as standalone type aliases
    // because they're only used as parametric type constructors
    const skipTypes = new Set(["registryEntryHolder", "registryEntryHolderSet"]);

    for (let name in types) {
        if (protoDefNativeTypes.includes(name as any)) continue;
        if (skipTypes.has(name)) continue;

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
    return `${type == "pc" ? "PC" : "Bedrock"}_${version?.replace(/\./g, "_").replace(/-/g, "_")}`;
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

const generateForVersion = (platform: "bedrock" | "pc", version: string) => {
    const dataDir = mcDataPath("");
    const pathId = `${platform}/${version}`;

    console.log(`Generating types for ${pathId}...`);

    // Load comments from YAML files (only for bedrock)
    const commentMap = platform === "bedrock"
        ? loadProtocolComments(version, dataDir)
        : {};

    if (Object.keys(commentMap).length > 0) {
        console.log(`  Loaded ${Object.keys(commentMap).length} comments`);
    }

    const dts = generateDefinitionsFor(pathId);
    const namespace = pathIdToVersionNamespace(pathId);

    mkdirSync(`./types`, { recursive: true });
    writeFileSync(`./types/${namespace}.d.ts`, dtsToString(dts, commentMap));
    console.log(`  ✓ Generated ./types/${namespace}.d.ts`);
};

const getAllVersions = (platform: "bedrock" | "pc"): string[] => {
    const paths = getDataPaths();
    const platformPaths = paths[platform];
    if (!platformPaths) return [];

    const versions: string[] = [];
    for (const version in platformPaths) {
        // Filter out non-version entries (like special versions with letters)
        if (version.match(/^\d+\.\d+/)) {
            const pathId = platformPaths[version]?.protocol;
            if (pathId && pathId.startsWith(platform)) {
                const versionPart = pathId.split("/")[1];
                if (versionPart && !versions.includes(versionPart)) {
                    versions.push(versionPart);
                }
            }
        }
    }
    return versions;
};

const main = () => {
    const args = process.argv.slice(2);

    // Parse CLI arguments: [platform] [version]
    // Examples:
    //   bedrock 1.21.120
    //   pc 1.20.0
    //   bedrock (all bedrock versions)
    //   pc (all PC versions)
    //   (no args - all versions)

    if (args.length === 0) {
        console.log("No arguments provided. Generating for all versions...");
        console.log("Usage: npm start [bedrock|pc] [version]");
        console.log("  bedrock 1.21.120 - Generate for specific bedrock version");
        console.log("  pc 1.20.0        - Generate for specific PC version");
        console.log("  bedrock          - Generate for all bedrock versions");
        console.log("  pc               - Generate for all PC versions");
        console.log("");

        // Generate for all platforms and versions
        for (const platform of ["bedrock", "pc"] as const) {
            const versions = getAllVersions(platform);
            console.log(`\nGenerating ${versions.length} ${platform} versions...`);
            for (const version of versions) {
                generateForVersion(platform, version);
            }
        }
    } else if (args.length === 1) {
        const platform = args[0] as "bedrock" | "pc";
        if (platform !== "bedrock" && platform !== "pc") {
            console.error(`Invalid platform: ${platform}. Use "bedrock" or "pc".`);
            process.exit(1);
        }

        const versions = getAllVersions(platform);
        console.log(`Generating ${versions.length} ${platform} versions...`);
        for (const version of versions) {
            generateForVersion(platform, version);
        }
    } else if (args.length === 2) {
        const [platform, version] = args as ["bedrock" | "pc", string];
        if (platform !== "bedrock" && platform !== "pc") {
            console.error(`Invalid platform: ${platform}. Use "bedrock" or "pc".`);
            process.exit(1);
        }

        generateForVersion(platform, version);
    } else {
        console.error("Too many arguments. Usage: npm start [bedrock|pc] [version]");
        process.exit(1);
    }
};

main();
