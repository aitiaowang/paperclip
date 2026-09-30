// @vitest-environment jsdom

import { i18n } from "../i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Agent, CompanyArtifact } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "./Workbench";

const state = vi.hoisted(() => ({ selectedCompanyId: "company-1" as string | null }));
const api = vi.hoisted(() => ({ agents: vi.fn(), teams: vi.fn(), artifacts: vi.fn(), create: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("../context/CompanyContext", () => ({ useCompany: () => ({
  selectedCompanyId: state.selectedCompanyId,
  selectedCompany: state.selectedCompanyId ? {
    id: state.selectedCompanyId,
    name: state.selectedCompanyId === "company-1" ? "甲公司" : "乙公司",
    issuePrefix: state.selectedCompanyId === "company-1" ? "AAA" : "BBB",
  } : null,
}) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("../api/agents", () => ({ agentsApi: { list: api.agents } }));
vi.mock("../api/teamCatalog", () => ({ teamCatalogApi: { catalogList: api.teams } }));
vi.mock("../api/artifacts", () => ({ artifactsApi: { list: api.artifacts } }));
vi.mock("../api/issues", () => ({ issuesApi: { create: api.create } }));
vi.mock("./TeamCatalog", () => ({ teamRoute: (id: string) => `/teams-catalog/${id}` }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, disableIssueQuicklook, ...props }: { to: string; children: React.ReactNode; disableIssueQuicklook?: boolean }) => <a href={to} data-quicklook={disableIssueQuicklook ? "off" : undefined} {...props}>{children}</a>,
  useNavigate: () => navigate,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function agent(id: string, status: Agent["status"]): Agent {
  return {
    id, companyId: "company-1", name: id, urlKey: id, role: "general", title: "分析员",
    icon: null, status, reportsTo: null, capabilities: "分析", adapterType: "claude_local",
    adapterConfig: {}, runtimeConfig: {}, budgetMonthlyCents: 0, spentMonthlyCents: 0,
    pauseReason: null, pausedAt: null, permissions: { canCreateAgents: false },
    lastHeartbeatAt: null, metadata: null, createdAt: new Date(), updatedAt: new Date(),
  };
}

const employees = [agent("ready", "idle"), agent("paused", "paused"), agent("approval", "pending_approval"), agent("failed", "error"), agent("terminated", "terminated")];
let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

async function renderPage() {
  await act(async () => { root.render(<QueryClientProvider client={queryClient}><Workbench /></QueryClientProvider>); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

function chooseReady() {
  Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "选择员工" && !button.disabled)?.click();
}

function enterRequest(value: string) {
  const textarea = container.querySelector("textarea")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setter.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function submit() {
  container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(async () => {
  await i18n.changeLanguage("zh-CN");
  state.selectedCompanyId = "company-1";
  api.agents.mockReset().mockResolvedValue(employees);
  api.teams.mockReset().mockResolvedValue([]);
  api.artifacts.mockReset().mockResolvedValue({ artifacts: [], nextCursor: null });
  api.create.mockReset().mockResolvedValue({ id: "issue-1", identifier: "AAA-1" });
  navigate.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  queryClient.clear();
});

describe("Workbench", () => {
  it("switches workbench and built-in template labels without translating custom data or resetting drafts", async () => {
    api.teams.mockResolvedValue([
      { id: "paperclipai:optional:content:content-machine", name: "Content Machine" },
      { id: "custom:content-machine", name: "Content Machine" },
    ]);
    await renderPage();
    await act(async () => { chooseReady(); });
    await act(async () => { enterRequest("保留这份草稿"); });
    expect(container.textContent).toContain("内容工厂");
    expect(container.textContent).toContain("Content Machine");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Employee workbench");
    expect(container.textContent).toContain("Team templates");
    expect(container.textContent).toContain("Assign to ready");
    expect(container.textContent).toContain("甲公司");
    expect(container.textContent).toContain("分析员");
    expect(container.textContent).not.toContain("内容工厂");
    expect(container.querySelector("textarea")?.value).toBe("保留这份草稿");
    await act(async () => { await i18n.changeLanguage("zh-CN"); });
    expect(container.textContent).toContain("员工工作台");
    expect(container.textContent).toContain("内容工厂");
    expect(container.textContent).toContain("交给 ready");
    expect(api.create).not.toHaveBeenCalled();
  });

  it("makes no scoped requests without a company", async () => {
    state.selectedCompanyId = null;
    await renderPage();
    expect(api.agents).not.toHaveBeenCalled();
    expect(api.teams).not.toHaveBeenCalled();
    expect(api.artifacts).not.toHaveBeenCalled();
  });

  it("shows non-runnable employee states and blocks empty requests", async () => {
    await renderPage();
    expect(container.textContent).toContain("连接异常");
    expect(container.textContent).toContain("待审批");
    expect(container.textContent).toContain("已终止");
    const buttons = Array.from(container.querySelectorAll("button")).filter((button) => button.textContent === "选择员工");
    expect(buttons.filter((button) => button.disabled)).toHaveLength(4);
    const create = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "创建任务")!;
    expect(create.disabled).toBe(true);
    await act(async () => { chooseReady(); });
    await act(async () => { enterRequest("   "); });
    await act(async () => { submit(); });
    expect(api.create).not.toHaveBeenCalled();
  });

  it("distinguishes no employees from employees who cannot take tasks", async () => {
    api.agents.mockResolvedValueOnce([]);
    await renderPage();
    expect(container.textContent).toContain("还没有员工");
    expect(container.textContent).not.toContain("目前没有可接任务的员工");

    queryClient.clear();
    api.agents.mockResolvedValueOnce([agent("terminated-only", "terminated")]);
    await renderPage();
    expect(container.textContent).toContain("目前没有可接任务的员工");
    expect(container.textContent).toContain("已终止");
  });

  it("opens a recent result at its artifact destination", async () => {
    const artifact: CompanyArtifact = {
      id: "result-1", source: "work_product", mediaKind: "document", title: "完成稿",
      previewText: null, contentType: null, contentPath: null, openPath: null, downloadPath: null,
      issue: { id: "issue-7", identifier: "AAA-7", title: "撰写方案" },
      project: null, createdByAgent: null, updatedAt: "2026-09-29T00:00:00Z",
      href: "/AAA/issues/AAA-7#work-product-result-1",
    };
    api.artifacts.mockResolvedValue({ artifacts: [artifact], nextCursor: null });
    await renderPage();
    const link = container.querySelector('a[aria-label="查看完成稿"]');
    expect(link?.getAttribute("href")).toBe(artifact.href);
    expect(link?.getAttribute("data-quicklook")).toBe("off");
  });

  it("blocks duplicate submission, retains text on failure, and routes on retry success", async () => {
    let rejectFirst!: (error: Error) => void;
    api.create.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject; }));
    await renderPage();
    await act(async () => { chooseReady(); });
    await act(async () => { enterRequest("整理客户反馈"); });
    await act(async () => { submit(); submit(); });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledWith("company-1", expect.objectContaining({ title: "整理客户反馈", status: "todo", assigneeAgentId: "ready", idempotencyKey: expect.any(String) }));
    const originalKey = api.create.mock.calls[0][1].idempotencyKey;
    await act(async () => { rejectFirst(new Error("暂时无法创建")); });
    expect(container.querySelector("textarea")?.value).toBe("整理客户反馈");
    expect(container.textContent).toContain("暂时无法创建");
    await act(async () => { submit(); });
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.create.mock.calls[1][1].idempotencyKey).toBe(originalKey);
    expect(navigate).toHaveBeenCalledWith("/AAA/issues/AAA-1");
  });

  it("resets draft on company switch and ignores old mutation completion", async () => {
    let resolveOld!: (issue: { id: string; identifier: string }) => void;
    api.create.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    await renderPage();
    await act(async () => { chooseReady(); });
    await act(async () => { enterRequest("旧任务"); });
    await act(async () => { submit(); });
    state.selectedCompanyId = "company-2";
    await renderPage();
    expect(container.querySelector("textarea")?.value).toBe("");
    expect(api.agents).toHaveBeenCalledWith("company-2");
    expect(api.artifacts).toHaveBeenCalledWith("company-2", { limit: 4 });
    await act(async () => { resolveOld({ id: "old", identifier: "AAA-2" }); });
    expect(navigate).not.toHaveBeenCalled();
  });
});
