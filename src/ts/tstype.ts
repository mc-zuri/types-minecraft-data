import { createFactory, match } from "@alan404/enum";
import type { Enum } from "@alan404/enum";
import { indent } from "../codegen.ts";

export type TSType = Enum<{
    // Type: { type: TSType };
    Reference: string;
    Array: TSType;
    Union: TSType[];
    Intersection: TSType[];
    Record: Record<string, TSType>;

    If: { field: string; equals?: string; type: TSType; };
}> & {
    generics?: Record<string, string>;
};

export const TSType = createFactory<TSType>(() => ({}));

function toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export const TSTypeToString = (ty: TSType, commentMap: Record<string, string[]> = {}, parentPath: string = ""): string => {
    return match<TSType, string>(ty)({
        // Type: ({ type }) => `export const ${} = ${TSTypeToString(type)};`,
        Reference: (v) => v,
        Array: (v) => `${TSTypeToString(v, commentMap, parentPath)}[]`,
        Union: (v) => `${v.map(x => TSTypeToString(x, commentMap, parentPath)).join(" | ") || "void"}`,
        Intersection: (v) => `${v.map(x => (
            `${x.type == "Union" ? "(" : ""}${TSTypeToString(x, commentMap, parentPath)}${x.type == "Union" ? ")" : ""}`
        )).join(" & ") || "void"}`,
        Record: (v) => `{\n${indent(
            Object.entries(v).map(([k, fieldType]) => {
                const opt = fieldType.type == "Union" && fieldType.data.length == 2 && fieldType.data.some(x => x.type == "Reference" && x.data == "undefined");
                const fieldPath = parentPath ? `${parentPath}.${k}` : k;

                // Try multiple path variations for comment lookup
                // The parent might be in snake_case, PascalCase, or camelCase in the YAML
                const pathVariations = [
                    fieldPath, // Original path (e.g., "login_tokens.identity")
                    fieldPath.split('.').map((part, i) =>
                        i === 0 ? part.replace(/_(.)/g, (_, c) => c.toUpperCase()).replace(/^(.)/, c => c.toUpperCase()) : part
                    ).join('.'), // PascalCase parent (e.g., "LoginTokens.identity")
                ];

                const fieldComments = pathVariations.map(p => commentMap[p]).find(c => c && c.length > 0) || [];
                const fieldJsdoc = fieldComments.length > 0
                    ? `/** ${fieldComments.join(' ')} */\n`
                    : '';
                return `${fieldJsdoc}${k}${opt ? "?" : ""}: ${TSTypeToString(opt ? fieldType.data.find(x => !(x.type == "Reference" && x.data == "undefined"))! : fieldType, commentMap, fieldPath)};`;
            })
        )}\n}`,

        If: ({ field, equals, type }) => {
            // If types should have been processed away by postprocessing
            // If we get here, something went wrong - output the inner type as a fallback
            console.warn(`Warning: Unprocessed If type detected for field "${field}" with equals "${equals}". This is a bug in postprocessing.`);
            return TSTypeToString(type, commentMap, parentPath);
        },
    });
};
