// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { AgentBasicsDialog } from "./AgentBasicsDialog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompanyId: "company-1" }) }));
vi.mock("@/hooks/useAgentAppearanceDraft", () => ({ useAgentAppearanceDraft: () => ({ appearance: {} }) }));
vi.mock("../AgentCharacter", () => ({ AgentCharacter: () => <div /> }));
vi.mock("@/hooks/useCloudInstance", () => ({ useCloudInstance: () => false }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: async () => ({ enableNativeRunner: true }) } }));
vi.mock("@/api/adapters", () => ({ adaptersApi: { list: async () => [
  { type: "codex_local", loaded: true, disabled: false },
  { type: "paperclip_runner", loaded: true, disabled: false },
] } }));

describe("AgentBasicsDialog localization", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let client: QueryClient;
  beforeEach(() => {
    changeLocale("zh-CN");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(async () => {
    await act(() => root.unmount());
    host.remove();
    client.clear();
    changeLocale("en");
  });
  it("translates both steps live while preserving the name, selection and submitted adapter identifier", async () => {
    const onContinue = vi.fn();
    await act(async () => {
      root.render(<QueryClientProvider client={client}><AgentBasicsDialog open onClose={vi.fn()} onInvite={vi.fn()} onContinue={onContinue} initialAdapter="codex_local" /></QueryClientProvider>);
    });
    expect(document.body.textContent).toContain("认识你的新员工");
    expect(document.body.textContent).toContain("邀请外部员工");
    const name = document.querySelector<HTMLInputElement>('input[maxlength="100"]')!;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "我的调研员");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() => changeLocale("en"));
    expect(document.body.textContent).toContain("Meet your next agent");
    expect(name.value).toBe("我的调研员");
    await act(() => document.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    expect(document.body.textContent).toContain("How should 我的调研员 work?");
    await act(() => changeLocale("zh-CN"));
    expect(document.body.textContent).toContain("选择执行器");
    expect(document.body.textContent).toContain("我的调研员将使用哪种方式工作？");
    expect(document.querySelector<HTMLInputElement>('input[value="codex_local"]')?.checked).toBe(true);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    await act(() => document.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    expect(onContinue).toHaveBeenCalledWith({ name: "我的调研员", adapterType: "codex_local", runnerProvider: "codex" });
  });
});
