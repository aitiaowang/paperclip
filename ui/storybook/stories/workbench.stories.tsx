import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Agent, CompanyArtifact } from "@paperclipai/shared";
import { WorkbenchSurface } from "@/pages/Workbench";
import { sampleTeam } from "@/pages/TeamCatalog.fixtures";

const agent = (id: string, name: string, status: Agent["status"], title: string, capabilities: string): Agent => ({
  id, companyId: "company-storybook", name, urlKey: id, role: "general", title,
  icon: null, status, reportsTo: null, capabilities, adapterType: "claude_local",
  adapterConfig: {}, runtimeConfig: {}, budgetMonthlyCents: 0, spentMonthlyCents: 0,
  pauseReason: null, pausedAt: null, permissions: { canCreateAgents: false },
  lastHeartbeatAt: null, metadata: null, createdAt: new Date(), updatedAt: new Date(),
});

const agents = [
  agent("research", "林岚", "idle", "研究分析", "市场调研、资料整理、竞品分析"),
  agent("writing", "陈序", "running", "内容编辑", "文案撰写、提纲与审校"),
  agent("ops", "周宁", "paused", "运营协调", "项目跟进、数据汇总"),
  agent("connection", "赵明", "error", "数据工程", "报表与数据清理"),
];

const artifacts: CompanyArtifact[] = [{
  id: "result-1", source: "document", mediaKind: "document", title: "客户反馈周报",
  previewText: null, contentType: "text/markdown", contentPath: null, openPath: null,
  downloadPath: null, issue: { id: "issue-1", identifier: "PAP-42", title: "整理本周客户反馈" },
  project: null, createdByAgent: { id: "research", name: "林岚" },
  updatedAt: "2026-09-29T08:00:00.000Z", href: "/PAP/issues/PAP-42",
}];

const meta: Meta<typeof WorkbenchSurface> = { title: "Surfaces/员工工作台", component: WorkbenchSurface };
export default meta;
type Story = StoryObj<typeof WorkbenchSurface>;

export const WithEmployees: Story = {
  args: { companyName: "示例公司", agents, teams: [sampleTeam], artifacts, onCreate: async () => {} },
};

export const GettingStarted: Story = {
  args: { companyName: "新公司", agents: [], teams: [sampleTeam], artifacts: [], onCreate: async () => {} },
};
