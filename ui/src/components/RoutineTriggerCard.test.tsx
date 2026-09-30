// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineTrigger } from "@paperclipai/shared";
import { changeLocale } from "../i18n";
import { RoutineTriggerCard } from "./RoutineTriggerCard";

const trigger = {
  id: "trigger-1", companyId: "company-1", routineId: "routine-1",
  kind: "webhook", label: "Release webhook", enabled: true,
  cronExpression: null, timezone: null, nextRunAt: null, lastFiredAt: null,
  publicId: null, secretId: null, signingMode: "bearer", replayWindowSec: 300,
  lastRotatedAt: null, lastResult: "Created execution issue issue-1",
  webhookUrl: "https://example.test/hooks/release",
  createdByAgentId: null, createdByUserId: null, updatedByAgentId: null, updatedByUserId: null,
  createdAt: new Date("2026-09-01T00:00:00Z"), updatedAt: new Date("2026-09-01T00:00:00Z"),
} as RoutineTrigger;

describe("RoutineTriggerCard localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    changeLocale("zh-CN");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    changeLocale("en");
  });

  it("switches labels and preserves draft names, URLs, and signing enum values", () => {
    const onSave = vi.fn();
    flushSync(() => root.render(<RoutineTriggerCard trigger={trigger} onSave={onSave} onRotate={vi.fn()} onDelete={vi.fn()} />));
    expect(container.textContent).toContain("签名方式");
    expect(container.textContent).toContain("Bearer 令牌");
    expect(container.textContent).toContain("已创建任务");
    const options = Array.from(container.querySelectorAll("option")).map(option => option.value);
    expect(options).toEqual(expect.arrayContaining(["app_webhook", "bearer", "hmac_sha256", "github_hmac", "none"]));

    const label = container.querySelector<HTMLInputElement>("input:not([readonly])")!;
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(label, "My unsaved webhook");
      label.dispatchEvent(new Event("input", { bubbles: true }));
    });
    flushSync(() => changeLocale("en"));
    expect(container.textContent).toContain("Signing mode");
    expect(container.textContent).toContain("Bearer token");
    expect(container.textContent).toContain("Task created");
    expect(label.value).toBe("My unsaved webhook");
    expect(container.querySelector<HTMLInputElement>("input[readonly]")?.value).toBe(trigger.webhookUrl);
    const save = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Save trigger")!;
    flushSync(() => save.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSave).toHaveBeenCalledWith("trigger-1", { label: "My unsaved webhook", signingMode: "bearer", replayWindowSec: 300 });
  });

  it("localizes known server result messages and preserves unknown diagnostic details", () => {
    const renderResult = (lastResult: string) => flushSync(() => root.render(
      <RoutineTriggerCard trigger={{ ...trigger, lastResult }} onSave={vi.fn()} onRotate={vi.fn()} onDelete={vi.fn()} />,
    ));
    renderResult("Execution failed");
    expect(container.textContent).toContain("执行失败");
    flushSync(() => changeLocale("en"));
    expect(container.textContent).toContain("Execution failed");
    renderResult("Custom upstream error: REQ-42");
    flushSync(() => changeLocale("zh-CN"));
    expect(container.textContent).toContain("Custom upstream error: REQ-42");
  });
});
