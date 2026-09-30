// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { AgentDetail as AgentDetailRecord } from "@paperclipai/shared";
import { changeLocale } from "../i18n";
import { AgentOverview } from "./AgentDetail";
vi.mock("@/lib/router", () => ({ Link: ({children, to}: {children: ReactNode; to: string}) => <a href={to}>{children}</a> }));
vi.mock("../components/MarkdownBody", () => ({ MarkdownBody: ({children}: {children: ReactNode}) => <div>{children}</div> }));
afterEach(() => changeLocale("en"));
it("switches overview labels and defaults while preserving employee content and links", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const employee = {id:"employee-1", name:"Custom Researcher", role:"researcher", status:"paused", adapterType:"codex_local", adapterConfig:{}, runtimeConfig:{}, title:"My custom title", capabilities:"Keep this custom English content"} as AgentDetailRecord;
  try {
    changeLocale("en");
    await act(async () => root.render(<QueryClientProvider client={client}><AgentOverview agent={employee} runs={[]} assignedIssues={[]} directReportCount={0} skillNames={["paperclip"]} agentRouteId="employee-1" /></QueryClientProvider>));
    expect(host.textContent).toContain("Identity");
    await act(async () => changeLocale("zh-CN"));
    expect(host.textContent).toContain("身份信息");
    expect(host.textContent).toContain("执行器默认配置");
    expect(host.textContent).toContain("暂无会话");
    expect(host.textContent).toContain("研究员");
    expect(host.textContent).toContain("My custom title");
    expect(host.textContent).toContain("Keep this custom English content");
    expect(host.querySelector('a[href="/agents/employee-1/runtime"]')?.textContent).toBe("配置");
    await act(async () => changeLocale("en"));
    expect(host.textContent).toContain("Identity");
    expect(host.textContent).not.toContain("身份信息");
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});
