import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BriefcaseBusiness, Check, FileText, Users } from "lucide-react";
import type { Agent, CatalogTeam, CompanyArtifact } from "@paperclipai/shared";
import { Link, useNavigate } from "@/lib/router";
import { agentsApi } from "../api/agents";
import { artifactsApi } from "../api/artifacts";
import { issuesApi } from "../api/issues";
import { teamCatalogApi } from "../api/teamCatalog";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { queryKeys } from "../lib/queryKeys";
import { teamRoute } from "./TeamCatalog";

const statusLabels: Record<Agent["status"], string> = {
  active: "可接任务",
  idle: "空闲",
  running: "执行中",
  paused: "已暂停",
  error: "连接异常",
  pending_approval: "待审批",
  terminated: "已终止",
};

function canAssign(agent: Agent) {
  return agent.status === "active" || agent.status === "idle" || agent.status === "running";
}

export function WorkbenchSurface({
  companyName,
  agents,
  teams,
  artifacts,
  agentsLoading = false,
  teamsLoading = false,
  artifactsLoading = false,
  agentsError = false,
  teamsError = false,
  artifactsError = false,
  onRetryAgents,
  onRetryTeams,
  onRetryArtifacts,
  onCreate,
}: {
  companyName: string;
  agents: Agent[];
  teams: CatalogTeam[];
  artifacts: CompanyArtifact[];
  agentsLoading?: boolean;
  teamsLoading?: boolean;
  artifactsLoading?: boolean;
  agentsError?: boolean;
  teamsError?: boolean;
  artifactsError?: boolean;
  onRetryAgents?: () => void;
  onRetryTeams?: () => void;
  onRetryArtifacts?: () => void;
  onCreate: (title: string, agentId: string, idempotencyKey: string) => Promise<void>;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const requestKeyRef = useRef<string | null>(null);
  const hasRunnableAgent = agents.some(canAssign);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId && canAssign(agent));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = request.trim();
    if (pendingRef.current || !title || !selectedAgent) return;
    pendingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const key = requestKeyRef.current ?? crypto.randomUUID();
    requestKeyRef.current = key;
    try {
      await onCreate(title, selectedAgent.id, key);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "创建失败，请检查后重试。");
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <h1 className="text-2xl font-semibold text-foreground">员工工作台</h1>
        <p className="text-sm text-muted-foreground">选择一位员工，交代一件具体的事。前往 <Link to="/issues" className="underline hover:text-foreground">任务列表</Link> 查看进度，在 <Link to="/artifacts" className="underline hover:text-foreground">结果中心</Link> 查看交付内容。</p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="workbench-employees">
        <div className="flex items-center justify-between gap-3">
          <h2 id="workbench-employees" className="text-lg font-semibold">员工</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/agents">查看全部 <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        {agentsLoading ? <p role="status" className="text-sm text-muted-foreground">正在加载员工…</p> :
          agentsError ? <p role="alert" className="text-sm text-destructive">员工加载失败。<Button variant="link" size="sm" onClick={onRetryAgents}>重试</Button></p> :
          agents.length === 0 ? <p className="text-sm text-muted-foreground">还没有员工。先从团队模板安装员工，再回来分配任务。</p> :
          <div className="flex flex-col gap-3">
            {!hasRunnableAgent ? <p className="text-sm text-muted-foreground">目前没有可接任务的员工。请查看员工状态，处理暂停、审批或连接异常后再分配任务。</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{agents.map((agent) => {
              const selectable = canAssign(agent);
              const selected = selectedAgentId === agent.id;
              return <Card key={agent.id} className={selected ? "border-primary" : undefined}>
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.title || agent.role}</p>
                    </div>
                    <span className={agent.status === "error" ? "shrink-0 text-xs text-destructive" : "shrink-0 text-xs text-muted-foreground"}>{statusLabels[agent.status]}</span>
                  </div>
                  <p className="min-h-10 text-sm text-muted-foreground">{agent.capabilities?.trim() || "尚未填写擅长领域"}</p>
                  <Button type="button" variant={selected ? "secondary" : "outline"} size="sm" disabled={!selectable} onClick={() => { setSelectedAgentId(agent.id); setSubmitError(null); requestKeyRef.current = null; }}>
                    {selected ? <Check className="h-4 w-4" /> : null}{selected ? "已选择" : "选择员工"}
                  </Button>
                </CardContent>
              </Card>;
            })}</div>
          </div>}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="workbench-task">
        <div className="flex flex-col gap-1">
          <h2 id="workbench-task" className="text-lg font-semibold">交代任务</h2>
          <p className="text-sm text-muted-foreground">任务创建后由所选员工按现有执行规则处理；审批和预算限制照常生效。</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="workbench-request" className="text-sm font-medium">一句话说明要完成的事</label>
          <textarea id="workbench-request" value={request} onChange={(event) => { setRequest(event.target.value); setSubmitError(null); requestKeyRef.current = null; }} placeholder="例如：整理本周客户反馈，列出最需要解决的三个问题" rows={3} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{selectedAgent ? `交给 ${selectedAgent.name}` : "请先选择一位可接任务的员工"}</p>
            <Button type="submit" disabled={!request.trim() || !selectedAgent || submitting}>{submitting ? "正在创建…" : "创建任务"}</Button>
          </div>
        </form>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4" aria-labelledby="workbench-teams">
          <div className="flex items-center justify-between gap-3">
            <h2 id="workbench-teams" className="text-lg font-semibold">团队模板</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/teams-catalog">浏览全部 <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {teamsLoading ? <p role="status" className="text-sm text-muted-foreground">正在加载团队模板…</p> :
            teamsError ? <p role="alert" className="text-sm text-destructive">团队模板加载失败。<Button variant="link" size="sm" onClick={onRetryTeams}>重试</Button></p> :
            teams.length === 0 ? <p className="text-sm text-muted-foreground">目前没有可用的团队模板。</p> :
            <div className="flex flex-col gap-2">{teams.slice(0, 3).map((team) => <Card key={team.id}><CardContent className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-2"><Users className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium">{team.name}</span></span><Button variant="outline" size="sm" asChild><Link to={teamRoute(team.id)}>查看并安装</Link></Button></CardContent></Card>)}</div>}
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="workbench-results">
          <div className="flex items-center justify-between gap-3">
            <h2 id="workbench-results" className="text-lg font-semibold">最近结果</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/artifacts">结果中心 <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {artifactsLoading ? <p role="status" className="text-sm text-muted-foreground">正在加载结果…</p> :
            artifactsError ? <p role="alert" className="text-sm text-destructive">结果加载失败。<Button variant="link" size="sm" onClick={onRetryArtifacts}>重试</Button></p> :
            artifacts.length === 0 ? <p className="text-sm text-muted-foreground">还没有交付结果。完成任务后，结果会出现在这里。</p> :
            <div className="flex flex-col gap-2">{artifacts.slice(0, 4).map((artifact) => <Card key={artifact.id}><CardContent className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{artifact.title}</span><span className="block truncate text-xs text-muted-foreground">{artifact.issue.title}</span></span></span><Button variant="ghost" size="sm" asChild><Link to={artifact.href} disableIssueQuicklook aria-label={`查看${artifact.title}`}><ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>}
        </section>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0" />持续工作需要服务器和运行员工所用的电脑保持开机且不休眠。仅关闭浏览器不会停止执行。</p>
    </div>
  );
}

function CompanyWorkbench({ companyId, companyName, companyPrefix, currentCompanyId }: { companyId: string; companyName: string; companyPrefix: string; currentCompanyId: () => string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({ queryKey: queryKeys.agents.list(companyId), queryFn: () => agentsApi.list(companyId) });
  const teamsQuery = useQuery({ queryKey: queryKeys.teamCatalog.catalog({}), queryFn: () => teamCatalogApi.catalogList() });
  const artifactsQuery = useQuery({ queryKey: ["workbench", "artifacts", companyId], queryFn: () => artifactsApi.list(companyId, { limit: 4 }) });

  async function create(title: string, agentId: string, idempotencyKey: string) {
    const agent = agentsQuery.data?.find((item) => item.id === agentId);
    if (!agent || !canAssign(agent) || currentCompanyId() !== companyId) throw new Error("员工状态已变化，请重新选择。");
    const issue = await issuesApi.create(companyId, { title, status: "todo", assigneeAgentId: agentId, idempotencyKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
    if (currentCompanyId() === companyId) navigate(`/${companyPrefix}/issues/${issue.identifier || issue.id}`);
  }

  return <WorkbenchSurface companyName={companyName} agents={agentsQuery.data ?? []} teams={teamsQuery.data ?? []} artifacts={artifactsQuery.data?.artifacts ?? []} agentsLoading={agentsQuery.isLoading} teamsLoading={teamsQuery.isLoading} artifactsLoading={artifactsQuery.isLoading} agentsError={agentsQuery.isError} teamsError={teamsQuery.isError} artifactsError={artifactsQuery.isError} onRetryAgents={() => void agentsQuery.refetch()} onRetryTeams={() => void teamsQuery.refetch()} onRetryArtifacts={() => void artifactsQuery.refetch()} onCreate={create} />;
}

export function Workbench() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const currentCompanyId = useRef(selectedCompanyId);
  currentCompanyId.current = selectedCompanyId;
  useEffect(() => { setBreadcrumbs([{ label: "员工工作台", href: "/workbench" }]); }, [setBreadcrumbs]);
  if (!selectedCompanyId || !selectedCompany) return <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">请先选择公司，再使用员工工作台。</div>;
  return <CompanyWorkbench key={selectedCompanyId} companyId={selectedCompanyId} companyName={selectedCompany.name} companyPrefix={selectedCompany.issuePrefix} currentCompanyId={() => currentCompanyId.current} />;
}
