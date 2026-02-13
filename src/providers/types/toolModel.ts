import { IJsonSchema } from "./iJsonSchema.js";

/**
 * The tool model
 */
export interface ToolModel {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: IJsonSchema;
        additionalProperties: boolean;
        strict: boolean;
    };
}