export const MODEL_BADGE: Record<string, { label: string; className: string }> = {
  claude:  { label: "Claude",  className: "bg-purple-600 text-white" },
  gpt:     { label: "GPT",     className: "bg-green-600 text-white" },
  gemini:  { label: "Gemini",  className: "bg-blue-600 text-white" },
  other:   { label: "Other",   className: "bg-zinc-600 text-white" },
};

export function getBadge(modelFamily: string) {
  return MODEL_BADGE[modelFamily] ?? MODEL_BADGE.other;
}
