import { useTranslation } from "../i18n";
import { Trans } from "react-i18next";
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
  active: "shellExtra.workbench.status.active",
  idle: "shellExtra.workbench.status.idle",
  running: "shellExtra.workbench.status.running",
  paused: "shellExtra.workbench.status.paused",
  error: "shellExtra.workbench.status.error",
  pending_approval: "shellExtra.workbench.status.pending_approval",
  terminated: "shellExtra.workbench.status.terminated",
};

// Only app-shipped catalog IDs have localized display names. Preserve custom catalog data.
const builtInTeamNameKeys: Record<string, string> = {
  "paperclipai:bundled:company-defaults:core-exec-team": "shellExtra.workbench.templates.coreExec",
  "paperclipai:bundled:product:product-design": "shellExtra.workbench.templates.productDesign",
  "paperclipai:bundled:software-development:product-engineering": "shellExtra.workbench.templates.productEngineering",
  "paperclipai:optional:content:content-machine": "shellExtra.workbench.templates.contentMachine",
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
  const { t } = useTranslation();
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
      setSubmitError(error instanceof Error ? error.message : t("shellExtra.workbench.createError"));
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{companyName}</p>
        <h1 className="text-2xl font-semibold text-foreground">{t("shellExtra.workbench.title")}</h1>
        <p className="text-sm text-muted-foreground"><Trans t={t} i18nKey="shellExtra.workbench.intro" components={{ tasks: <Link to="/issues" className="underline hover:text-foreground" />, results: <Link to="/artifacts" className="underline hover:text-foreground" /> }} /></p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="workbench-employees">
        <div className="flex items-center justify-between gap-3">
          <h2 id="workbench-employees" className="text-lg font-semibold">{t("shellExtra.workbench.employees")}</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/agents">{t("shellExtra.workbench.viewAll")} <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        {agentsLoading ? <p role="status" className="text-sm text-muted-foreground">{t("shellExtra.workbench.loadingEmployees")}</p> :
          agentsError ? <p role="alert" className="text-sm text-destructive">{t("shellExtra.workbench.employeesError")}<Button variant="link" size="sm" onClick={onRetryAgents}>{t("shellExtra.workbench.retry")}</Button></p> :
          agents.length === 0 ? <p className="text-sm text-muted-foreground">{t("shellExtra.workbench.noEmployees")}</p> :
          <div className="flex flex-col gap-3">
            {!hasRunnableAgent ? <p className="text-sm text-muted-foreground">{t("shellExtra.workbench.noAvailableEmployees")}</p> : null}
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
                    <span className={agent.status === "error" ? "shrink-0 text-xs text-destructive" : "shrink-0 text-xs text-muted-foreground"}>{t(statusLabels[agent.status])}</span>
                  </div>
                  <p className="min-h-10 text-sm text-muted-foreground">{agent.capabilities?.trim() || t("shellExtra.workbench.noCapabilities")}</p>
                  <Button type="button" variant={selected ? "secondary" : "outline"} size="sm" disabled={!selectable} onClick={() => { setSelectedAgentId(agent.id); setSubmitError(null); requestKeyRef.current = null; }}>
                    {selected ? <Check className="h-4 w-4" /> : null}{selected ? t("shellExtra.workbench.selected") : t("shellExtra.workbench.selectEmployee")}
                  </Button>
                </CardContent>
              </Card>;
            })}</div>
          </div>}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="workbench-task">
        <div className="flex flex-col gap-1">
          <h2 id="workbench-task" className="text-lg font-semibold">{t("shellExtra.workbench.assignTask")}</h2>
          <p className="text-sm text-muted-foreground">{t("shellExtra.workbench.taskRules")}</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="workbench-request" className="text-sm font-medium">{t("shellExtra.workbench.requestLabel")}</label>
          <textarea id="workbench-request" value={request} onChange={(event) => { setRequest(event.target.value); setSubmitError(null); requestKeyRef.current = null; }} placeholder={t("shellExtra.workbench.requestPlaceholder")} rows={3} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {submitError ? <p role="alert" className="text-sm text-destructive">{submitError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{selectedAgent ? t("shellExtra.workbench.assignTo", { name: selectedAgent.name }) : t("shellExtra.workbench.selectFirst")}</p>
            <Button type="submit" disabled={!request.trim() || !selectedAgent || submitting}>{submitting ? t("shellExtra.workbench.creating") : t("shellExtra.workbench.create")}</Button>
          </div>
        </form>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-4" aria-labelledby="workbench-teams">
          <div className="flex items-center justify-between gap-3">
            <h2 id="workbench-teams" className="text-lg font-semibold">{t("shellExtra.workbench.teams")}</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/teams-catalog">{t("shellExtra.workbench.browseAll")} <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {teamsLoading ? <p role="status" className="text-sm text-muted-foreground">{t("shellExtra.workbench.loadingTeams")}</p> :
            teamsError ? <p role="alert" className="text-sm text-destructive">{t("shellExtra.workbench.teamsError")}<Button variant="link" size="sm" onClick={onRetryTeams}>{t("shellExtra.workbench.retry")}</Button></p> :
            teams.length === 0 ? <p className="text-sm text-muted-foreground">{t("shellExtra.workbench.noTeams")}</p> :
            <div className="flex flex-col gap-2">{teams.slice(0, 3).map((team) => <Card key={team.id}><CardContent className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-2"><Users className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium">{Object.hasOwn(builtInTeamNameKeys, team.id) ? t(builtInTeamNameKeys[team.id]) : team.name}</span></span><Button variant="outline" size="sm" asChild><Link to={teamRoute(team.id)}>{t("shellExtra.workbench.install")}</Link></Button></CardContent></Card>)}</div>}
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="workbench-results">
          <div className="flex items-center justify-between gap-3">
            <h2 id="workbench-results" className="text-lg font-semibold">{t("shellExtra.workbench.recentResults")}</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/artifacts">{t("shellExtra.workbench.results")} <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {artifactsLoading ? <p role="status" className="text-sm text-muted-foreground">{t("shellExtra.workbench.loadingResults")}</p> :
            artifactsError ? <p role="alert" className="text-sm text-destructive">{t("shellExtra.workbench.resultsError")}<Button variant="link" size="sm" onClick={onRetryArtifacts}>{t("shellExtra.workbench.retry")}</Button></p> :
            artifacts.length === 0 ? <p className="text-sm text-muted-foreground">{t("shellExtra.workbench.noResults")}</p> :
            <div className="flex flex-col gap-2">{artifacts.slice(0, 4).map((artifact) => <Card key={artifact.id}><CardContent className="flex items-center justify-between gap-3 p-3"><span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{artifact.title}</span><span className="block truncate text-xs text-muted-foreground">{artifact.issue.title}</span></span></span><Button variant="ghost" size="sm" asChild><Link to={artifact.href} disableIssueQuicklook aria-label={t("shellExtra.workbench.viewResult", { title: artifact.title })}><ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div>}
        </section>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted-foreground"><BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0" />{t("shellExtra.workbench.keepRunning")}</p>
    </div>
  );
}

function CompanyWorkbench({ companyId, companyName, companyPrefix, currentCompanyId }: { companyId: string; companyName: string; companyPrefix: string; currentCompanyId: () => string | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({ queryKey: queryKeys.agents.list(companyId), queryFn: () => agentsApi.list(companyId) });
  const teamsQuery = useQuery({ queryKey: queryKeys.teamCatalog.catalog({}), queryFn: () => teamCatalogApi.catalogList() });
  const artifactsQuery = useQuery({ queryKey: ["workbench", "artifacts", companyId], queryFn: () => artifactsApi.list(companyId, { limit: 4 }) });

  async function create(title: string, agentId: string, idempotencyKey: string) {
    const agent = agentsQuery.data?.find((item) => item.id === agentId);
    if (!agent || !canAssign(agent) || currentCompanyId() !== companyId) throw new Error(t("shellExtra.workbench.agentChanged"));
    const issue = await issuesApi.create(companyId, { title, status: "todo", assigneeAgentId: agentId, idempotencyKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
    if (currentCompanyId() === companyId) navigate(`/${companyPrefix}/issues/${issue.identifier || issue.id}`);
  }

  return <WorkbenchSurface companyName={companyName} agents={agentsQuery.data ?? []} teams={teamsQuery.data ?? []} artifacts={artifactsQuery.data?.artifacts ?? []} agentsLoading={agentsQuery.isLoading} teamsLoading={teamsQuery.isLoading} artifactsLoading={artifactsQuery.isLoading} agentsError={agentsQuery.isError} teamsError={teamsQuery.isError} artifactsError={artifactsQuery.isError} onRetryAgents={() => void agentsQuery.refetch()} onRetryTeams={() => void teamsQuery.refetch()} onRetryArtifacts={() => void artifactsQuery.refetch()} onCreate={create} />;
}

export function Workbench() {
  const { t } = useTranslation();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const currentCompanyId = useRef(selectedCompanyId);
  currentCompanyId.current = selectedCompanyId;
  useEffect(() => { setBreadcrumbs([{ label: t("shellExtra.workbench.title"), href: "/workbench" }]); }, [setBreadcrumbs, t]);
  if (!selectedCompanyId || !selectedCompany) return <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">{t("shellExtra.workbench.noCompany")}</div>;
  return <CompanyWorkbench key={selectedCompanyId} companyId={selectedCompanyId} companyName={selectedCompany.name} companyPrefix={selectedCompany.issuePrefix} currentCompanyId={() => currentCompanyId.current} />;
}
