import { t } from "@/i18n";
import { auditSectionHref, type AuditSection } from "./audit/audit-navigation";

export type AgentDetailView =
  | "overview"
  | "instructions"
  | "skills"
  | "runtime"
  | "secrets"
  | "tools"
  | "channels"
  | "permissions"
  | "api-keys"
  | "revisions"
  | "run-detail";

export type AgentLocalDetailView = Exclude<AgentDetailView, "run-detail">;

export const AGENT_DETAIL_NAVIGATION: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ value: AgentLocalDetailView; label: string }>;
}> = [
  {
    get label() { return t("agentDetailShell.nav.0"); },
    items: [
      { value: "overview", get label() { return t("agentDetailShell.nav.1"); } },
      { value: "instructions", get label() { return t("agentDetailShell.nav.2"); } },
      { value: "skills", get label() { return t("agentDetailShell.nav.3"); } },
    ],
  },
  {
    get label() { return t("agentDetailShell.nav.4"); },
    items: [
      { value: "runtime", get label() { return t("agentDetailShell.nav.5"); } },
      { value: "secrets", get label() { return t("agentDetailShell.nav.6"); } },
      { value: "tools", get label() { return t("agentDetailShell.nav.7"); } },
      { value: "channels", get label() { return t("agentDetailShell.nav.8"); } },
    ],
  },
  {
    get label() { return t("agentDetailShell.nav.9"); },
    items: [
      { value: "permissions", get label() { return t("agentDetailShell.nav.10"); } },
      { value: "api-keys", get label() { return t("agentDetailShell.nav.11"); } },
      { value: "revisions", get label() { return t("agentDetailShell.nav.12"); } },
    ],
  },
] as const;

export function parseAgentDetailView(value: string | null): AgentLocalDetailView {
  if (value === "instructions" || value === "prompts") return "instructions";
  if (value === "skills") return "skills";
  if (value === "runtime" || value === "configure" || value === "configuration") return "runtime";
  if (value === "secrets") return "secrets";
  if (value === "tools") return "tools";
  if (value === "channels") return "channels";
  if (value === "permissions" || value === "trust") return "permissions";
  if (value === "api-keys" || value === "keys") return "api-keys";
  if (value === "revisions" || value === "history") return "revisions";
  return "overview";
}

export function agentDetailHref(agentRef: string, view: AgentLocalDetailView = "overview") {
  return `/agents/${agentRef}/${view}`;
}

export function agentLegacyAuditSection(value: string | null): AuditSection | null {
  if (value === "runs") return "runs";
  if (value === "audit" || value === "activity") return "activity";
  if (value === "cost" || value === "costs") return "costs";
  if (value === "budget" || value === "budgets") return "budgets";
  return null;
}

export function agentScopedAuditHref(agentId: string, section: AuditSection) {
  return auditSectionHref(section, {
    mode: section === "activity" ? "agents" : undefined,
    agentId,
  });
}
