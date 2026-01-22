import * as fs from 'fs';
import * as path from 'path';

export interface CommentMap {
    [path: string]: string[];
}

function cleanComment(rawComment: string | null | undefined): string[] {
    if (!rawComment) {
        return [];
    }
    return rawComment
        .split('\n')
        .map(line => line.trim().replace(/^#+\s*/, '').trim())
        .filter(line => line.length > 0);
}

function getIndentation(line: string): number {
    let ind = 0;
    for (const c of line) {
        if (c === ' ') ind++;
        else break;
    }
    return ind;
}

/**
 * Extracts comments from YAML content.
 * Parses line by line to associate comments with their following keys.
 */
export function extractCommentsFromYAML(yamlContent: string): CommentMap {
    const commentMap: CommentMap = {};
    const data = yamlContent.replace(/\t/g, '    ');
    const lines = data.split('\n');
    let comments: string[] = [];

    const path: string[] = [];
    const parentValues: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimedLine = lines[i].trim();

        // Skip empty lines and special directives
        if (!trimedLine || trimedLine.startsWith('!')) {
            continue;
        }

        const [keyPart, ...valParts] = trimedLine.endsWith(':')
            ? [trimedLine.slice(0, -1), '']
            : trimedLine.split(': ');

        const key = keyPart?.trim() || '';
        const val = valParts.join(': ').trim();

        const thisLevel = getIndentation(lines[i]);
        const nextLevel = i + 1 < lines.length ? getIndentation(lines[i + 1]) : 0;

        // Collect comment lines
        if (key.startsWith('#')) {
            comments.push(trimedLine.replace('#', '').trim());
            continue;
        }

        // Associate collected comments with the current key
        if (comments.length > 0 && key) {
            const fullPath = [...path, key].join('.');
            commentMap[fullPath] = comments;
            comments = [];
        }

        // Update path tracking based on indentation
        if (thisLevel < nextLevel) {
            path.push(key);
            parentValues.push(val);
        } else if (thisLevel > nextLevel) {
            const popCount = Math.floor((thisLevel - nextLevel) / 2);
            for (let j = 0; j < popCount; j++) {
                path.pop();
                parentValues.pop();
            }
        }
    }

    return commentMap;
}

/**
 * Loads YAML files and extracts comments from bedrock protocol files.
 * Falls back to 'latest' directory if YAML files don't exist for the specific version.
 */
export interface PacketBoundInfo {
    [packetName: string]: 'client' | 'server' | 'both';
}

export interface PacketEventInfo {
    eventName: string;
    packetType: string;
    bound: 'client' | 'server' | 'both';
}

/**
 * Extracts packet bound information from proto.yml.
 * Maps packet names to their bound direction (client, server, or both).
 */
export function extractPacketBounds(yamlContent: string): PacketBoundInfo {
    const boundMap: PacketBoundInfo = {};
    const lines = yamlContent.split('\n');
    let currentPacket: string | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Match packet definitions (e.g., "packet_login:")
        if (/^packet_\w+:/.test(trimmed)) {
            currentPacket = trimmed.slice(0, -1); // Remove trailing ':'
        }

        // Match bound annotations
        if (trimmed.startsWith('!bound:') && currentPacket) {
            const bound = trimmed.split(':')[1]?.trim() as 'client' | 'server' | 'both';
            if (bound) {
                boundMap[currentPacket] = bound;
            }
            currentPacket = null; // Reset for next packet
        }
    }

    return boundMap;
}

/**
 * Extracts packet event information from proto.yml.
 * Returns array of packets with their event names (without packet_ prefix), packet types, and bounds.
 */
export function extractPacketEvents(yamlContent: string): PacketEventInfo[] {
    const events: PacketEventInfo[] = [];
    const lines = yamlContent.split('\n');
    let currentPacket: string | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Match packet definitions (e.g., "packet_login:")
        if (/^packet_\w+:/.test(trimmed)) {
            currentPacket = trimmed.slice(0, -1); // Remove trailing ':'
        }

        // Match bound annotations
        if (trimmed.startsWith('!bound:') && currentPacket) {
            const bound = trimmed.split(':')[1]?.trim() as 'client' | 'server' | 'both';
            if (bound) {
                // Remove "packet_" prefix to get event name
                const eventName = currentPacket.replace(/^packet_/, '');
                events.push({
                    eventName,
                    packetType: currentPacket,
                    bound
                });
            }
            currentPacket = null; // Reset for next packet
        }
    }

    return events;
}

/**
 * Loads packet bound information from bedrock protocol files.
 * Falls back to 'latest' directory if proto.yml doesn't exist for the specific version.
 */
export function loadPacketBounds(version: string, dataDir: string): PacketBoundInfo {
    const versionDir = path.join(dataDir, 'bedrock', version);
    const latestDir = path.join(dataDir, 'bedrock', 'latest');

    let protoPath = path.join(versionDir, 'proto.yml');

    // Fallback to latest if file doesn't exist
    if (!fs.existsSync(protoPath)) {
        protoPath = path.join(latestDir, 'proto.yml');
    }

    if (fs.existsSync(protoPath)) {
        const protoYaml = fs.readFileSync(protoPath, 'utf-8');
        return extractPacketBounds(protoYaml);
    }

    return {};
}

/**
 * Loads packet event information from bedrock protocol files.
 * Falls back to 'latest' directory if proto.yml doesn't exist for the specific version.
 */
export function loadPacketEvents(version: string, dataDir: string): PacketEventInfo[] {
    const versionDir = path.join(dataDir, 'bedrock', version);
    const latestDir = path.join(dataDir, 'bedrock', 'latest');

    let protoPath = path.join(versionDir, 'proto.yml');

    // Fallback to latest if file doesn't exist
    if (!fs.existsSync(protoPath)) {
        protoPath = path.join(latestDir, 'proto.yml');
    }

    if (fs.existsSync(protoPath)) {
        const protoYaml = fs.readFileSync(protoPath, 'utf-8');
        return extractPacketEvents(protoYaml);
    }

    return [];
}

export function loadProtocolComments(version: string, dataDir: string): CommentMap {
    const versionDir = path.join(dataDir, 'bedrock', version);
    const latestDir = path.join(dataDir, 'bedrock', 'latest');

    let protoPath = path.join(versionDir, 'proto.yml');
    let typesPath = path.join(versionDir, 'types.yml');

    // Fallback to latest if files don't exist
    if (!fs.existsSync(protoPath)) {
        protoPath = path.join(latestDir, 'proto.yml');
    }
    if (!fs.existsSync(typesPath)) {
        typesPath = path.join(latestDir, 'types.yml');
    }

    const commentMap: CommentMap = {};

    // Extract from proto.yml if it exists
    if (fs.existsSync(protoPath)) {
        const protoYaml = fs.readFileSync(protoPath, 'utf-8');
        const protoComments = extractCommentsFromYAML(protoYaml);
        Object.assign(commentMap, protoComments);
    }

    // Extract from types.yml if it exists
    if (fs.existsSync(typesPath)) {
        const typesYaml = fs.readFileSync(typesPath, 'utf-8');
        const typesComments = extractCommentsFromYAML(typesYaml);
        Object.assign(commentMap, typesComments);
    }

    return commentMap;
}
