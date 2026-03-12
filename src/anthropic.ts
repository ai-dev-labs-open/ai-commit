import Anthropic from "@anthropic-ai/sdk";
import { CliError } from "./errors";
import { parseSuggestionText } from "./normalize";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { ProviderConfig, ProviderRequest, RawCommitSuggestion, SuggestionProvider } from "./types";

interface MessageBlock {
  type: string;
  text?: string;
}

function extractTextContent(message: { content?: MessageBlock[] }): string {
  const content = Array.isArray(message.content) ? message.content : [];

  return content
    .filter((block: MessageBlock) => block.type === "text" && typeof block.text === "string")
    .map((block: MessageBlock) => block.text ?? "")
    .join("\n")
    .trim();
}

export class AnthropicSuggestionProvider implements SuggestionProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async suggestCommit(request: ProviderRequest): Promise<RawCommitSuggestion> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      stream: false,
      temperature: 0,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(request)
        }
      ]
    });
    const text = extractTextContent(response);

    if (!text) {
      throw new CliError("Claude returned an empty response.", "EMPTY_MODEL_RESPONSE");
    }

    return parseSuggestionText(text);
  }
}

export function createAnthropicProvider(config: ProviderConfig): SuggestionProvider {
  return new AnthropicSuggestionProvider(config);
}
