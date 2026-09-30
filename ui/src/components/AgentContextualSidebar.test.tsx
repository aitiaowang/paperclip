// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AgentContextualSidebar } from "./AgentContextualSidebar";
import { queryKeys } from "@/lib/queryKeys";
import { changeLocale } from "@/i18n";
import { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("./ContextualSidebarFrame", () => ({
  ContextualSidebarFrame: ({
    title,
    showHeader,
    className,
    children,
  }: {
    title: string;
    showHeader?: boolean;
    className?: string;
    children: React.ReactNode;
  }) => (
    <aside data-title={title} data-show-header={String(showHeader)} className={className}>
      {children}
    </aside>
  ),
}));

vi.mock("./SidebarNavItem", () => ({
  SidebarNavItem: ({ to, label }: { to: string; label: string }) => <a href={to}>{label}</a>,
}));

describe("AgentContextualSidebar", () => {
  it("switches mounted navigation labels while preserving routes", async () => {
    changeLocale("en");
    const client = new QueryClient();
    client.setQueryData(queryKeys.instance.experimentalSettings, { enableChatConnectors: false });
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter>
        <AgentContextualSidebar agentRef="alpha" agentId="agent-1" agentName="Alpha" />
      </MemoryRouter></QueryClientProvider>));
      const routes = Array.from(container.querySelectorAll("a"), (a) => a.getAttribute("href"));
      expect(container.textContent).toContain("Harness / Runtime");
      await act(async () => changeLocale("zh-CN"));
      expect(container.textContent).toContain("执行器 / 运行环境");
      expect(container.textContent).toContain("密钥与变量");
      expect(container.textContent).toContain("审计");
      expect(container.textContent).toContain("运行记录");
      expect(Array.from(container.querySelectorAll("a"), (a) => a.getAttribute("href"))).toEqual(routes);
      await act(async () => changeLocale("en"));
      expect(container.textContent).toContain("Permissions / Trust");
    } finally {
      await act(async () => root.unmount());
      client.clear();
      changeLocale("en");
    }
  });
  it.each([false, true])("shows agent Channels only when chat connectors are enabled (%s)", (enabled) => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.instance.experimentalSettings, { enableChatConnectors: enabled });
    const markup = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter>
      <AgentContextualSidebar agentRef="agent" agentId="agent-1" agentName="Agent" />
    </MemoryRouter></QueryClientProvider>);
    expect(markup.includes('href="/agents/agent/channels"')).toBe(enabled);
    expect(markup).toContain('href="/agents/agent/tools"');
    client.clear();
  });
  it("renders local definition/runtime/governance links and scoped Audit links", () => {
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agents/codexcoder/runtime"]}>
          <AgentContextualSidebar agentRef="codexcoder" agentId="agent-1" agentName="Codex Coder" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(markup).toContain("Codex Coder");
    expect(markup).toContain('data-show-header="false"');
    expect(markup).toContain("border-r border-border bg-background");
    expect(markup).toContain('data-slot="contextual-sidebar-nav"');
    expect(markup).toContain('href="/agents/codexcoder/overview"');
    expect(markup).toContain('href="/agents/codexcoder/permissions"');
    expect(markup).toContain('href="/agents/codexcoder/api-keys"');
    expect(markup).toContain('href="/activity?mode=agents&amp;agentId=agent-1"');
    expect(markup).toContain('href="/activity/runs?agentId=agent-1"');
    expect(markup).toContain("Harness / Runtime");
    expect(markup).toContain("Permissions / Trust");
  });
});
