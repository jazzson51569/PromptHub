import type { OutputFormatItem, Prompt } from "@prompthub/shared/types";
export { copyTextToClipboard } from "../../utils/clipboard";
import { parsePromptVariables } from "./prompt-modal-utils";

const SYSTEM_VARIABLES = new Set([
  "CURRENT_DATE",
  "CURRENT_TIME",
  "CURRENT_DATETIME",
  "CURRENT_YEAR",
  "CURRENT_MONTH",
  "CURRENT_DAY",
  "CURRENT_WEEKDAY",
]);

export interface ResolvedPromptContent {
  systemPrompt?: string;
  userPrompt: string;
}

export function resolvePromptContentByLanguage(
  prompt: Prompt,
  showEnglish: boolean,
): ResolvedPromptContent {
  return {
    systemPrompt: showEnglish
      ? (prompt.systemPromptEn || prompt.systemPrompt)
      : prompt.systemPrompt,
    userPrompt: showEnglish
      ? (prompt.userPromptEn || prompt.userPrompt)
      : prompt.userPrompt,
  };
}

export function hasUserDefinedPromptVariables(
  systemPrompt?: string,
  userPrompt?: string,
): boolean {
  const combined = `${systemPrompt || ""}\n${userPrompt || ""}`;
  return parsePromptVariables(combined).some(
    (variable) => !SYSTEM_VARIABLES.has(variable.name),
  );
}

export function buildPromptCopyText(
  content: ResolvedPromptContent,
  options?: {
    outputFormatItems?: OutputFormatItem[];
    prompts?: Prompt[];
    currentPrompt?: Prompt;
    showEnglish?: boolean;
  },
): string {
  const { outputFormatItems, prompts, currentPrompt, showEnglish = false } = options || {};

  if (outputFormatItems && prompts && currentPrompt) {
    const currentOutputFormatItems = outputFormatItems
      .filter((item) => item.sourcePromptId === currentPrompt.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (currentOutputFormatItems.length > 0) {
      const promptById = new Map(prompts.map((p) => [p.id, p]));
      const parts: string[] = [];

      for (const item of currentOutputFormatItems) {
        let targetPrompt: Prompt | undefined;

        if (item.targetPromptId === null) {
          targetPrompt = currentPrompt;
        } else {
          targetPrompt = promptById.get(item.targetPromptId);
        }

        if (targetPrompt) {
          const resolved = resolvePromptContentByLanguage(targetPrompt, showEnglish);
          if (resolved.systemPrompt) {
            parts.push(resolved.systemPrompt);
          }
          parts.push(resolved.userPrompt);
        }
      }

      return parts.join("\n\n");
    }
  }

  return content.userPrompt;
}
