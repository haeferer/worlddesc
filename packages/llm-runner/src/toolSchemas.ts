export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: string[];
  description?: string;
  oneOf?: JsonSchema[];
}

export interface ChatToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
  };
}

export interface ResponsesToolSchema {
  type: "function";
  name: string;
  description: string;
  parameters: JsonSchema;
}

export function buildFirstLlmToolSchemas(): ChatToolSchema[] {
  return [
    {
      type: "function",
      function: {
        name: "get_current_scene",
        description: "Return the current player-facing scene.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_known_object",
        description: "Return player-known detail for a specific object.",
        parameters: {
          type: "object",
          properties: {
            objectId: {
              type: "string",
              description: "Known object id to inspect."
            }
          },
          required: ["objectId"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_object_knowledge",
        description:
          "Return curated external background knowledge for a known object. Use this for explanation or guide context, not for hard scene facts.",
        parameters: {
          type: "object",
          properties: {
            objectId: {
              type: "string",
              description: "Known object id whose curated background knowledge you want to retrieve."
            }
          },
          required: ["objectId"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "resolve_intent",
        description:
          "Resolve a broad point-and-click style player intent from free user language into a structured action command or a structured rejection. Use this before perform_action for normal player input.",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "object",
              properties: {
                verb: {
                  type: "string",
                  enum: ["go", "examine", "open", "close", "take", "unlock", "use", "put", "toggle", "read", "input"]
                },
                object1: {
                  type: "string"
                },
                object2: {
                  type: "string"
                },
                inputText: {
                  type: "string"
                },
                inputNumber: {
                  type: "number"
                }
              },
              required: ["verb"],
              additionalProperties: false
            }
          },
          required: ["intent"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "perform_action",
        description:
          "Execute a concrete structured player action command. Do not use this directly from free user language; use it only after a matching resolve_intent result.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["interaction", "way"]
                },
                objectId: {
                  type: "string"
                },
                actionId: {
                  type: "string"
                },
                additionalText: {
                  type: "string"
                }
              },
              required: ["kind", "actionId"],
              additionalProperties: false
            }
          },
          required: ["command"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_new_events",
        description: "Return new perception events since the last event poll.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    }
  ];
}

export function buildFirstLlmResponseToolSchemas(): ResponsesToolSchema[] {
  return buildFirstLlmToolSchemas().map((tool) => ({
    type: "function",
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  }));
}
