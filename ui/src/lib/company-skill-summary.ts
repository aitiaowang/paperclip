import { t } from "../i18n";

type SkillSummaryInput = {
  tagline?: string | null;
  description?: string | null;
  key?: string | null;
  name?: string | null;
  sourceBadge?: string | null;
  sourceKind?: string | null;
  sourceLabel?: string | null;
  forkedFrom?: boolean;
  forkedFromSkillId?: string | null;
};

const bundledSlugs = new Set([
  "agentmail", "first-task", "paperclip", "paperclip-board",
  "paperclip-converting-plans-to-tasks", "paperclip-create-agent", "para-memory-files", "slack",
]);

function isStaleYamlBlockScalarIndicator(raw: string) {
  return /^[>|][+-]?$/.test(raw.trim());
}

export function sanitizeSkillSummaryText(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").trim();
  if (isStaleYamlBlockScalarIndicator(cleaned)) return null;
  return cleaned.length > 0 ? cleaned : null;
}

export function resolveSkillSummaryText(
  skill: SkillSummaryInput,
  options: { fallbackKey?: boolean } = {},
): string | null {
  const summary = sanitizeSkillSummaryText(skill.tagline) ?? sanitizeSkillSummaryText(skill.description);
  if (summary) {
    const slug = skill.key?.replace(/^paperclipai\/paperclip\//, "");
    if (skill.sourceBadge === "paperclip" && !skill.forkedFrom && !skill.forkedFromSkillId
      && skill.key?.startsWith("paperclipai/paperclip/") && slug && bundledSlugs.has(slug)) {
      const translationKey = `bundledSkillSummary.${slug}`;
      // Translate only the unchanged bundled summary, never user-authored content.
      if (summary === t(translationKey, { lng: "en" })) return t(translationKey);
    }
    return summary;
  }

  if (options.fallbackKey) {
    const fallbackKey = skill.key?.trim();
    if (fallbackKey) return fallbackKey;
  }

  return null;
}
