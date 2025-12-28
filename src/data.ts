import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve minecraft-data from node_modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const resolveMinecraftData = () => {
    // Try to resolve from current working directory's node_modules first
    const cwdNodeModules = join(process.cwd(), "node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(cwdNodeModules)) {
        return cwdNodeModules;
    }

    // Try parent directory's node_modules (for monorepo setups)
    let parentNodeModules = join(process.cwd(), "../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(parentNodeModules)) {
        return parentNodeModules;
    }

    // Try parent directory's node_modules (for monorepo setups)
    parentNodeModules = join(process.cwd(), "../../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(parentNodeModules)) {
        return parentNodeModules;
    }

    // Try parent directory's node_modules (for monorepo setups)
    parentNodeModules = join(process.cwd(), "../../../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(parentNodeModules)) {
        return parentNodeModules;
    }

    // Try to resolve from package's own node_modules (when installed as dependency)
    let nodeModulesPath = join(__dirname, "../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(nodeModulesPath)) {
        return nodeModulesPath;
    }

    // Try to resolve from package's own node_modules (when installed as dependency)
    nodeModulesPath = join(__dirname, "../../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(nodeModulesPath)) {
        return nodeModulesPath;
    }

    // Try to resolve from package's own node_modules (when installed as dependency)
    nodeModulesPath = join(__dirname, "../../../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(nodeModulesPath)) {
        return nodeModulesPath;
    }

    // Try to resolve from package's own node_modules (when installed as dependency)
    nodeModulesPath = join(__dirname, "../../../../node_modules/minecraft-data/minecraft-data/data/");
    if (existsSync(nodeModulesPath)) {
        return nodeModulesPath;
    }

    // Fallback to local minecraft-data folder (for development)
    const localPath = "./minecraft-data/data/";
    if (existsSync(localPath)) {
        return localPath;
    }

    throw new Error("minecraft-data not found. Install it with: npm install minecraft-data");
};

export const mcDataRoot = resolveMinecraftData();
export const mcDataPath = (path: string) => mcDataRoot + path;

export const getJSON = <T>(path: string): T => {
    return JSON.parse(readFileSync(path).toString()) as T;
};

export type McDataResourceType = "blocks" | "protocol" | "version" | "proto" | "attributes"
    | "blockCollisionShapes" | "biomes" | "enchantments" | "effects" | "items"
    | "recipes" | "instruments" | "materials" | "entities" | "windows" |
    "language" | "foods" | "particles" | "tints" | "mapIcons" |
    "protocolComments" | "sounds" | "commands" | "blockLoot" |
    "entityLoot" | "loginPacket" | "steve" | "types" | "blockStates"
    | "blocksB2J" | "blocksJ2B" | "blockMappings";

export type McDataPaths = Record<"pc" | "bedrock", Partial<Record<string, Partial<Record<McDataResourceType, string>>>>>;

export const getDataPaths = () => {
    return getJSON<McDataPaths>(mcDataPath("dataPaths.json"));
};

export const getProtoDef = () => {

};
