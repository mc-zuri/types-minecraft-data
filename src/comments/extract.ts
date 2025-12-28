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
