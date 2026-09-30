// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdapterLoginPanel, ModelDropdown } from "./AgentConfigForm";
import { useLocalAiLogin } from "./ai-connections/useLocalAiLogin";

const api = vi.hoisted(() => ({
  getActiveAdapterAuthLoginSession: vi.fn(), getAdapterAuthLoginStatus: vi.fn(),
  startAdapterAuthLogin: vi.fn(), cancelAdapterAuthLogin: vi.fn(),
  getClaudeOAuthTokenStatus: vi.fn(), getActiveClaudeSetupTokenLoginSession: vi.fn(),
  getClaudeSetupTokenLoginStatus: vi.fn(), getClaudeSetupTokenLoginPrompt: vi.fn(),
  startClaudeSetupTokenLogin: vi.fn(), submitClaudeSetupTokenBrowserCode: vi.fn(),
  cancelClaudeSetupTokenLogin: vi.fn(),
}));
const localApi = vi.hoisted(() => ({ startLocalLogin: vi.fn(), checkLocalLogin: vi.fn(), cancelLocalLogin: vi.fn(), connectLocal: vi.fn() }));
vi.mock("../api/agents", () => ({ agentsApi: api }));
vi.mock("@/api/ai-connections", () => ({ aiConnectionsApi: localApi }));
vi.mock("../adapters/use-adapter-capabilities", () => ({ useAdapterCapabilities: () => (type: string) => ({ login: { panelMode: type === "claude_local" ? "submitted_browser_code" : "displayed_code" } }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let client: QueryClient;
beforeEach(() => {
  changeLocale("en");
  vi.resetAllMocks();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); changeLocale("zh-CN"); });
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); }
async function renderPanel(adapterType: string) {
  await act(async () => root.render(<QueryClientProvider client={client}><AdapterLoginPanel companyId="company" adapterType={adapterType} environmentId="sandbox" /></QueryClientProvider>));
  await settle();
}
function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("updates an open model picker while retaining its manual model draft and raw selection", async () => {
  const onChange = vi.fn();
  function Harness() {
    const [open, setOpen] = useState(true);
    return <TooltipProvider><ModelDropdown models={[]} value="provider/original" onChange={onChange} open={open} onOpenChange={setOpen} allowDefault required={false} groupByProvider={false} creatable /></TooltipProvider>;
  }
  await act(async () => root.render(<Harness />));
  const input = document.querySelector<HTMLInputElement>('input[placeholder="Search models... (type to create)"]')!;
  await act(async () => setInput(input, "custom/model-id"));
  await act(async () => { changeLocale("zh-CN"); });
  expect(document.body.textContent).toContain("使用手动输入的模型");
  expect(document.body.textContent).toContain("provider/original");
  expect(input.value).toBe("custom/model-id");
  await act(async () => { changeLocale("en"); });
  expect(document.body.textContent).toContain("Use manual model");
  await act(async () => Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Use manual model"))!.click());
  expect(onChange).toHaveBeenCalledExactlyOnceWith("custom/model-id");
});

it("updates displayed-code login labels without restarting or changing its code and URL", async () => {
  const session = { sessionId: "session", status: "awaiting_user", prompt: { code: "ABCD-EFGH", url: "https://provider.example/auth" } };
  api.getActiveAdapterAuthLoginSession.mockResolvedValue(session);
  api.getAdapterAuthLoginStatus.mockResolvedValue(session);
  await renderPanel("codex_local");
  expect(host.textContent).toContain("Copy the code");
  await act(async () => { changeLocale("zh-CN"); });
  expect(host.textContent).toContain("复制代码，然后打开身份验证页面。");
  expect(host.textContent).toContain("ABCD-EFGH");
  expect(host.querySelector("a")?.getAttribute("href")).toBe("https://provider.example/auth");
  await act(async () => { changeLocale("en"); });
  expect(host.textContent).toContain("Copy the code");
  expect(api.startAdapterAuthLogin).not.toHaveBeenCalled();
  expect(api.cancelAdapterAuthLogin).not.toHaveBeenCalled();
});

it("retains a browser-code draft while both login labels and accessibility text change", async () => {
  const session = { sessionId: "session", status: "awaiting_user", prompt: { authorizationUrl: "https://provider.example/authorize" } };
  api.getClaudeOAuthTokenStatus.mockResolvedValue(null);
  api.getActiveClaudeSetupTokenLoginSession.mockResolvedValue(session);
  api.getClaudeSetupTokenLoginStatus.mockResolvedValue(session);
  api.getClaudeSetupTokenLoginPrompt.mockResolvedValue(session.prompt);
  await renderPanel("claude_local");
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Browser code"]')!;
  await act(async () => setInput(input, "raw-browser-code"));
  await act(async () => { changeLocale("zh-CN"); });
  expect(input.getAttribute("aria-label")).toBe("浏览器代码");
  expect(host.textContent).toContain("提交");
  expect(input.value).toBe("raw-browser-code");
  await act(async () => { changeLocale("en"); });
  expect(input.getAttribute("aria-label")).toBe("Browser code");
  expect(input.value).toBe("raw-browser-code");
  expect(api.startClaudeSetupTokenLogin).not.toHaveBeenCalled();
  expect(api.submitClaudeSetupTokenBrowserCode).not.toHaveBeenCalled();
  expect(api.cancelClaudeSetupTokenLogin).not.toHaveBeenCalled();
});

it("retranslates a retained login error without retrying the failed request", async () => {
  api.getActiveAdapterAuthLoginSession.mockResolvedValue(null);
  api.startAdapterAuthLogin.mockRejectedValue({ failed: true });
  await renderPanel("codex_local");
  await act(async () => Array.from(host.querySelectorAll("button")).find(button => button.textContent === "Sign in")!.click());
  await settle();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Could not start the login.");
  await act(async () => { changeLocale("zh-CN"); });
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("无法开始登录。");
  await act(async () => { changeLocale("en"); });
  expect(host.querySelector('[role="alert"]')?.textContent).toBe("Could not start the login.");
  expect(api.startAdapterAuthLogin).toHaveBeenCalledTimes(1);
});

it("retranslates a stored local-login expiry without starting or checking login again", async () => {
  localApi.startLocalLogin.mockResolvedValue({ sessionId: "local-session", command: "CODEX_HOME=/raw codex login" });
  localApi.checkLocalLogin.mockResolvedValue({ status: "expired" });
  function Harness() {
    const login = useLocalAiLogin("company", { provider: "openai", method: "subscription", name: "User account", ownership: "personal", allAgents: true, agentIds: [] }, true);
    return <><p>{login.error}</p><code>{login.command}</code></>;
  }
  await act(async () => root.render(<Harness />));
  await settle();
  expect(host.textContent).toContain("This sign-in attempt expired.");
  await act(async () => { changeLocale("zh-CN"); });
  expect(host.textContent).toContain("本次登录已过期，请重新登录。");
  expect(host.querySelector("code")?.textContent).toBe("CODEX_HOME=/raw codex login");
  await act(async () => { changeLocale("en"); });
  expect(host.textContent).toContain("This sign-in attempt expired.");
  expect(localApi.startLocalLogin).toHaveBeenCalledTimes(1);
  expect(localApi.checkLocalLogin).toHaveBeenCalledTimes(1);
  expect(localApi.cancelLocalLogin).not.toHaveBeenCalled();
});
