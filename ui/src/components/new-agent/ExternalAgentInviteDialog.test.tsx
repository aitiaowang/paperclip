// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { ExternalAgentInviteDialog } from "./ExternalAgentInviteDialog";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({ token: "fixture-token", onboardingTextPath: "/api/invites/fixture-token/onboarding.txt" })),
  onboarding: vi.fn(async () => ({ onboarding: {} })),
  copy: vi.fn(async () => {}),
}));
vi.mock("@/api/access", () => ({ accessApi: { createCompanyInvite: mocks.create, getInviteOnboarding: mocks.onboarding } }));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: mocks.copy }));
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
beforeEach(() => {
  changeLocale("en");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); client.clear();
  vi.clearAllMocks(); changeLocale("zh-CN");
});

it("switches invite labels while preserving the message, generated prompt, and invitation payload", async () => {
  await act(async () => root.render(<QueryClientProvider client={client}><ExternalAgentInviteDialog companyId="company-1" onClose={() => {}} onBack={() => {}} /></QueryClientProvider>));
  const message = document.querySelector<HTMLTextAreaElement>("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(message, "Keep this user message 原文");
    message.dispatchEvent(new Event("input", { bubbles: true }));
    changeLocale("zh-CN");
  });
  expect(document.body.textContent).toContain("邀请外部智能体");
  expect(message.value).toBe("Keep this user message 原文");
  expect(mocks.create).not.toHaveBeenCalled();
  const generate = [...document.querySelectorAll("button")].find(button => button.textContent === "生成接入提示词")!;
  await act(async () => { generate.click(); await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(mocks.create).toHaveBeenCalledWith("company-1", { allowedJoinTypes: "agent", humanRole: null, agentMessage: "Keep this user message 原文" });
  const prompt = document.querySelector<HTMLTextAreaElement>('textarea[readonly]')!;
  expect(prompt).toBeTruthy();
  const originalPrompt = prompt.value;
  expect(mocks.copy).toHaveBeenCalledWith(originalPrompt);
  await act(async () => changeLocale("en"));
  expect(document.body.textContent).toContain("Agent onboarding prompt");
  expect(prompt.value).toBe(originalPrompt);
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
