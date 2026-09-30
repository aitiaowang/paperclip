import { afterEach, describe, expect, it } from "vitest";
import { changeLocale } from "../i18n";
import { resolveSkillSummaryText, sanitizeSkillSummaryText } from "./company-skill-summary";

describe("company skill summary text", () => {
  afterEach(() => changeLocale("en"));
  const bundled = {
    key: "paperclipai/paperclip/slack",
    sourceBadge: "paperclip",
    description: "Use the assigned Slack bot from Slack conversations, Paperclip tasks, and routines to read shared discussions and collaborate.",
  };
  it("shows the bundled summary in the current language without changing source data", () => {
    const original = { ...bundled };
    changeLocale("zh-CN");
    expect(resolveSkillSummaryText(bundled)).toBe("通过分配的 Slack 机器人，在 Slack 对话、Paperclip 任务和定时任务中阅读共享讨论并协作。");
    changeLocale("en");
    expect(resolveSkillSummaryText(bundled)).toBe(bundled.description);
    expect(bundled).toEqual(original);
  });
  it("preserves edited summaries, custom taglines and unrelated third-party skills", () => {
    changeLocale("zh-CN");
    expect(resolveSkillSummaryText({ ...bundled, description: "Our custom instructions" })).toBe("Our custom instructions");
    expect(resolveSkillSummaryText({ ...bundled, tagline: "My custom summary" })).toBe("My custom summary");
    expect(resolveSkillSummaryText({ ...bundled, key: "another-team/slack" })).toBe(bundled.description);
    expect(resolveSkillSummaryText({ ...bundled, sourceBadge: "github" })).toBe(bundled.description);
    expect(resolveSkillSummaryText({ ...bundled, forkedFrom: true })).toBe(bundled.description);
  });
  it("drops stray YAML block scalar markers without rewriting other markdown", () => {
    expect(sanitizeSkillSummaryText(">")).toBeNull();
    expect(sanitizeSkillSummaryText("|")).toBeNull();
    expect(sanitizeSkillSummaryText("- Helpful summary")).toBe("- Helpful summary");
    expect(sanitizeSkillSummaryText("# Helpful summary")).toBe("# Helpful summary");
  });

  it("falls back to the skill key when requested and the summary is empty", () => {
    expect(resolveSkillSummaryText({
      name: "Humanizer",
      key: "content/humanizer",
      description: ">",
    }, { fallbackKey: true })).toBe("content/humanizer");

    expect(resolveSkillSummaryText({
      name: "humanizer",
      key: "humanizer",
      description: "|",
    }, { fallbackKey: true })).toBe("humanizer");
  });

  it("falls back from a stale tagline to a real description", () => {
    expect(resolveSkillSummaryText({
      tagline: ">",
      description: "Cleans up rough AI prose.",
      key: "content/humanizer",
      name: "Humanizer",
    })).toBe("Cleans up rough AI prose.");
  });
});
