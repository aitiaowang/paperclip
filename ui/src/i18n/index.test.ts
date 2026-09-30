// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { changeLocale, getLocale, t } from ".";

afterEach(() => {
  changeLocale("zh-CN");
  localStorage.clear();
});

describe("global language preference", () => {
  it("persists the selected language and updates the document language", () => {
    changeLocale("en");
    expect(localStorage.getItem("paperclip.ui.locale")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(getLocale()).toBe("en");
    expect(t("newIssue.createTask")).toBe("Create Task");
    changeLocale("zh-CN");
    expect(localStorage.getItem("paperclip.ui.locale")).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(t("newIssue.createTask")).toBe("创建任务");
  });

  it("applies another tab's language change and ignores unrelated or invalid values", () => {
    changeLocale("zh-CN");
    window.dispatchEvent(new StorageEvent("storage", { key: "paperclip.ui.locale", newValue: "en" }));
    expect(getLocale()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "zh-CN" }));
    window.dispatchEvent(new StorageEvent("storage", { key: "paperclip.ui.locale", newValue: "invalid-language" }));
    changeLocale("invalid-language");
    expect(getLocale()).toBe("en");
  });
});
