import { match } from "@alan404/enum";
import { TSType } from "../ts/tstype.ts";

type PCtx = {
    node: TSType;
    up?: PCtx;
};

function child(c: PCtx, node: TSType): PCtx {
    return { node, up: c };
}

// --- Main pass ---
export function postprocess(c: PCtx): TSType {
    return match<TSType, TSType>(c.node)({
        Reference: () => c.node,
        Array: (v) => TSType.Array(postprocess(child(c, v))),
        Union: (arr) => {
            const processed = arr.map(x => postprocess(child(c, x)));
            // Deduplicate union members by JSON stringifying
            const unique = Array.from(
                new Map(processed.map(t => [JSON.stringify(t), t])).values()
            );
            return TSType.Union(unique);
        },
        Intersection: (arr) => TSType.Intersection(arr.map(x => postprocess(child(c, x)))),

        If: (v) => postprocess(child(c, v.type)),

        Record: (record) => {
            const processedRecord: Record<string, TSType> = {};

            for (let [k, v] of Object.entries(record)) {
                // If this field is conditional (union of If types), handle merging
                if (v.type == "Union" && v.data.every(x => x.type == "If")) {
                    // Process the If nodes themselves, which will extract their inner types
                    const types = v.data.map(x => {
                        const ifNode = x as TSType & { type: "If" };
                        return postprocess(child(c, ifNode.data.type));
                    });

                    // Check if we have records to merge
                    const records = types.filter(t => t.type == "Record");
                    const nonRecords = types.filter(t => t.type != "Record");

                    // If we have records and the field is unnamed (anonymous), merge into parent
                    if (records.length > 0 && k === "undefined") {
                        // Merge all record fields into parent
                        const mergedFields: Record<string, TSType[]> = {};
                        for (const rec of records) {
                            for (const [field, type] of Object.entries(rec.data)) {
                                (mergedFields[field] ||= []).push(type);
                            }
                        }

                        // Add merged fields as optional to parent
                        for (const [field, fieldTypes] of Object.entries(mergedFields)) {
                            // Deduplicate types by converting to string and back
                            const uniqueTypes = Array.from(
                                new Map(fieldTypes.map(t => [JSON.stringify(t), t])).values()
                            );
                            const unionType = uniqueTypes.length === 1
                                ? uniqueTypes[0]!
                                : TSType.Union(uniqueTypes);
                            // Make optional by adding undefined
                            processedRecord[field] = TSType.Union([unionType, TSType.Reference("undefined")]);
                        }

                        // Skip adding the "undefined" field itself
                        continue;
                    } else {
                        // Normal conditional field
                        // Filter out void/undefined types
                        const nonVoidTypes = types.filter(t =>
                            !(t.type == "Reference" && (t.data == "void" || t.data == "undefined"))
                        );

                        if (nonVoidTypes.length === 0) {
                            // All cases are void - field should be undefined
                            processedRecord[k] = TSType.Reference("undefined");
                        } else {
                            // Check if this is a complete switch (all cases covered)
                            // Heuristic: if we have multiple If nodes (>= 3), it's likely complete
                            // If we have only 1-2 If nodes, it's likely incomplete (e.g., only "true" case for boolean)
                            const isLikelyComplete = v.data.length >= 3;

                            // Deduplicate nonVoidTypes
                            const uniqueNonVoidTypes = Array.from(
                                new Map(nonVoidTypes.map(t => [JSON.stringify(t), t])).values()
                            );

                            const baseType = uniqueNonVoidTypes.length === 1
                                ? uniqueNonVoidTypes[0]!
                                : TSType.Union(uniqueNonVoidTypes);

                            if (isLikelyComplete) {
                                // All cases likely covered - field is required
                                processedRecord[k] = baseType;
                            } else {
                                // Incomplete coverage - field is optional
                                processedRecord[k] = TSType.Union([baseType, TSType.Reference("undefined")]);
                            }
                        }
                    }
                } else {
                    processedRecord[k] = postprocess(child(c, v));
                }
            }

            return TSType.Record(processedRecord);
        },
    });
}
