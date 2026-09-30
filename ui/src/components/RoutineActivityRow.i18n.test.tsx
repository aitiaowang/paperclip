// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { RoutineActivityRow } from "./RoutineActivityRow";
import { ManagedRoutinesList } from "./ManagedRoutinesList";

vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("routine history and list language changes", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  beforeEach(() => {
    changeLocale("en");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    changeLocale("zh-CN");
  });

  it("changes activity labels without collapsing the raw payload", async () => {
    const event = { id: "event", action: "routine.webhook_test_received", createdAt: new Date("2026-09-30T10:00:00Z"), details: { customer: "Acme", status: "active" } };
    await act(async () => root.render(<RoutineActivityRow event={event} />));
    expect(host.textContent).toContain("Connection test passed");
    await act(async () => host.querySelector("button")!.click());
    const payload = host.querySelector("pre")!.textContent;
    await act(async () => { changeLocale("zh-CN"); });
    expect(host.textContent).toContain("连接测试通过");
    expect(host.querySelector("button")!.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector("pre")!.textContent).toBe(payload);
    await act(async () => { changeLocale("en"); });
    expect(host.textContent).toContain("Connection test passed");
    expect(host.querySelector("pre")!.textContent).toBe(payload);
  });

  it("changes row actions while preserving pending state and user data", async () => {
    const onRunNow = vi.fn();
    await act(async () => root.render(<ManagedRoutinesList routines={[{ key: "r", title: "Daily Acme", status: "active", routineId: "r", resourceKey: "daily" }]} runningRoutineKey="r" onRunNow={onRunNow} onToggleEnabled={vi.fn()} />));
    expect(host.textContent).toContain("Running...");
    await act(async () => { changeLocale("zh-CN"); });
    expect(host.textContent).toContain("正在运行…");
    expect(host.textContent).toContain("Daily Acme");
    const runButton = Array.from(host.querySelectorAll("button")).find(button => button.textContent?.includes("正在运行"));
    expect(runButton?.disabled).toBe(true);
    expect(onRunNow).not.toHaveBeenCalled();
    await act(async () => { changeLocale("en"); });
    expect(host.textContent).toContain("Running...");
  });
});
