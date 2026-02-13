import { Type as SchemaType, type Tool } from "@google/genai";
import type { ToolModel } from "../../types/index.js";

export function convertToGeminiFunctions(tools?: ToolModel[]): Tool[] | undefined {
  if (!tools) return undefined;

  return [
    {
      functionDeclarations: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: Object.fromEntries(
            Object.entries(tool.function.parameters.properties).map(([key, value]) => [
              key,
              {
                type:
                  value.type === "string"
                    ? SchemaType.STRING
                    : value.type === "number"
                      ? SchemaType.NUMBER
                      : value.type === "boolean"
                        ? SchemaType.BOOLEAN
                        : value.type === "array"
                          ? SchemaType.ARRAY
                          : SchemaType.OBJECT,
                description: value.description,
                ...(value.type === "array"
                  ? {
                      items: {
                        type: SchemaType.STRING,
                      },
                    }
                  : {}),
                ...(value.type === "object"
                  ? {
                      properties: {},
                      required: [],
                    }
                  : {}),
              },
            ]),
          ),
          required: tool.function.parameters.required,
        },
      })),
    },
  ];
}
