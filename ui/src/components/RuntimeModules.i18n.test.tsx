// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeLocale } from "../i18n";
import { help } from "./agent-config-primitives";
import { AgentSecretAccessEditor } from "./AgentSecretAccessEditor";
import { CapabilityBadges, RiskBadge } from "../pages/tools/shared";
import { AiConnectionLegacyNotice } from "./ai-connections/AiConnectionManagement";
import { codexReasoningEffortOptions } from "../lib/codex-reasoning-effort";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  changeLocale("en");
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  changeLocale("en");
});

it("reads fresh help copy and preserves literal prompt template variables after switching", () => {
  expect(help.name).toBe("Display name for this agent.");
  changeLocale("zh-CN");
  expect(help.name).toBe("员工的显示名称。");
  expect(help.promptTemplate).toContain("{{ agent.name }}");
  expect(help.workspaceBranchTemplate).toContain("{{issue.identifier}}");
  changeLocale("en");
  expect(help.name).toBe("Display name for this agent.");
});

it("switches secret access controls without changing bindings or user aliases", () => {
  const onChange = vi.fn();
  flushSync(() => root.render(<AgentSecretAccessEditor
    config={{ "access.RELEASE_API": { type: "secret_ref", secretId: "secret-id", version: "latest" } }}
    secrets={[]} onChange={onChange}
  />));
  expect(host.textContent).toContain("Add API access");
  const alias = host.querySelector<HTMLInputElement>('input[aria-label="Access alias"]')!;
  expect(alias.value).toBe("RELEASE_API");
  flushSync(() => changeLocale("zh-CN"));
  expect(host.textContent).toContain("添加 API 访问");
  expect(host.querySelector<HTMLInputElement>('input[aria-label="访问别名"]')?.value).toBe("RELEASE_API");
  expect(onChange).not.toHaveBeenCalled();
});

it("switches live tool capability and risk badges", () => {
  flushSync(() => root.render(<><CapabilityBadges isReadOnly isWrite isDestructive /><RiskBadge risk="high" /></>));
  expect(host.textContent).toContain("read-only");
  flushSync(() => changeLocale("zh-CN"));
  expect(host.textContent).toContain("只读");
  expect(host.textContent).toContain("破坏性");
  expect(host.textContent).toContain("高");
});

it("switches legacy authentication guidance and Codex effort labels without changing option values", () => {
  const adopt = vi.fn();
  flushSync(() => root.render(<AiConnectionLegacyNotice onAdopt={adopt} />));
  const originalValues = codexReasoningEffortOptions("gpt-5.4").map(option => option.value);
  expect(host.textContent).toContain("Choose a managed connection");
  flushSync(() => changeLocale("zh-CN"));
  expect(host.textContent).toContain("选择托管连接");
  expect(codexReasoningEffortOptions("gpt-5.4").map(option => option.value)).toEqual(originalValues);
  expect(codexReasoningEffortOptions("gpt-5.4").find(option => option.value === "high")?.label).toBe("高");
  expect(adopt).not.toHaveBeenCalled();
});
