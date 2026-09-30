// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import type { ProviderTraceMetadata } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { ProviderTraceStatusBadge, runRequestedProviderTrace } from "./ProviderTraceStatusBadge";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { void i18n.changeLanguage("en"); });

it("switches badge copy while preserving status styling and trace protocol", () => {
  void i18n.changeLanguage("en");
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => root.render(<ProviderTraceStatusBadge showOff />));
  expect(host.textContent).toBe("Trace off");
  const className = host.firstElementChild!.className;
  const iconClass = host.querySelector("svg")!.getAttribute("class");
  act(() => { void i18n.changeLanguage("zh-CN"); });
  expect(host.textContent).toBe("跟踪已关闭");
  expect(host.firstElementChild!.className).toBe(className);
  expect(host.querySelector("svg")!.getAttribute("class")).toBe(iconClass);
  act(() => root.render(<ProviderTraceStatusBadge trace={{ status: "deleted", expiresAt: "2099-01-01", frameCount: 2, byteCount: 40 } as ProviderTraceMetadata} />));
  expect(host.textContent).toBe("跟踪已删除");
  expect(host.firstElementChild!.className).toBe(className);
  expect(host.firstElementChild!.getAttribute("title")).toContain("2 帧");
  expect(runRequestedProviderTrace({ debug: { providerTrace: "raw" } })).toBe(true);
  expect(runRequestedProviderTrace({ debug: { providerTrace: "原始" } })).toBe(false);
  act(() => root.unmount());
});
