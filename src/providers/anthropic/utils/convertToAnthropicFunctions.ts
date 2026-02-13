import type { Anthropic } from "@anthropic-ai/sdk";
import type { ToolModel } from "../../types/index.js";

export function convertToAnthropicFunctions(tools?: ToolModel[]): Anthropic.Messages.ToolUnion[] | undefined {
  if (!tools) {
    return undefined;
  }

  return tools.map((tool): Anthropic.Messages.ToolUnion => {
    return {
      name: tool.function.name,
      description: tool.function.description,
      input_schema: {
        type: "object",
        properties: tool.function.parameters.properties,
        required: tool.function.parameters.required,
      },
    };
  });
}
