import { useTranslation } from "../../i18n";
import { AppLogo } from "@/pages/apps/AppLogo";
import { ConnectionChoiceList } from "@/features/connections/ConnectionChoiceList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AI_PROVIDERS,
  aiConnectionProblem,
  bindingProblem,
  matchesAiRequirement,
  personalAiDefault,
  type AiConnectionBinding,
  type AiConnectionRequirement,
  type AiConnectionSummary,
} from "./model";

const PROBLEM_KEYS: Record<string, string> = {
  "No connection selected. Connect an account to continue.": "newAgentSetup.ai.problem.missing",
  "Choose a connection compatible with this provider and sign-in method.": "newAgentSetup.ai.problem.compatible",
  "This connection is no longer available for this agent. Choose another connection.": "newAgentSetup.ai.problem.unavailable",
  "Choose a company-shared connection.": "newAgentSetup.ai.problem.shared",
  "This credential is not shared with you. Choose a connection you can use.": "newAgentSetup.ai.problem.notShared",
  "Needs attention. Reconnect this account to continue.": "newAgentSetup.ai.problem.needsAttention",
  "Expired. Reconnect this account to continue.": "newAgentSetup.ai.problem.expired",
  "Revoked. Reconnect this account to continue.": "newAgentSetup.ai.problem.revoked"
};

export interface AiConnectionPickerProps {
  requirement: AiConnectionRequirement;
  connections: AiConnectionSummary[];
  value?: AiConnectionBinding;
  currentUserId: string;
  agentId: string;
  agentName: string;
  loading?: boolean;
  error?: string;
  readOnly?: boolean;
  onChange: (binding: AiConnectionBinding) => void;
  onConnect: () => void;
  onRetry?: () => void;
}

export function AiConnectionPicker({
  requirement,
  connections,
  value,
  currentUserId,
  agentId,
  loading,
  error,
  readOnly,
  onChange,
  onConnect,
  onRetry,
}: AiConnectionPickerProps) {
  const { t } = useTranslation();
  const methodLabel = (provider: AiConnectionBinding["provider"], method: AiConnectionBinding["method"]) =>
    method === "subscription" ? t(`newAgentSetup.ai.subscription.${provider}`) : t("newAgentSetup.ai.apiKey");
  const problemLabel = (message: string | null | undefined) => message ? t(PROBLEM_KEYS[message] ?? message, { defaultValue: message }) : message;
  const compatible = connections.filter((connection) =>
    matchesAiRequirement(connection, requirement),
  );
  const personalDefault = personalAiDefault(
    connections,
    requirement,
    currentUserId,
  );
  const problem = value ? bindingProblem(
    value,
    requirement,
    connections,
    currentUserId,
    agentId,
  ) : undefined;
  const select = (
    mode: "shared",
    connection: AiConnectionSummary,
  ) =>
    onChange({
      provider: requirement.provider,
      method: connection.method,
      mode,
      connectionId: connection.id,
      grantId: connection.grantId,
    });
  return (
    <section className="flex flex-col gap-4" aria-label={t("newAgentSetup.ai.connection")}>
      <div className="flex items-center gap-3">
        <AppLogo
          name={AI_PROVIDERS[requirement.provider].name}
          brandKey={requirement.provider}
          logoUrl={AI_PROVIDERS[requirement.provider].logo}
          darkLogoUrl={requirement.provider === "xai" ? "/brands/adapters/grok-dark.svg" : undefined}
          size={32}
        />
        <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-sm font-semibold">{t("newAgentSetup.ai.connection")}</h3>
        <p className="text-xs text-muted-foreground">
          {AI_PROVIDERS[requirement.provider].name}
          {value && value.mode !== "responsible_user" && ` · ${methodLabel(value.provider, value.method)}`}
        </p>
        </div>
      </div>
      {loading ? (
        <div role="status" aria-label={t("newAgentSetup.ai.loading")}>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" onClick={onRetry}>
              {t("newAgentSetup.ai.retry")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <ConnectionChoiceList
            disabled={readOnly}
            selectedId={value?.mode === "responsible_user" ? "responsible_user" : value?.connectionId}
            choices={[
              { id: "responsible_user", name: t("newAgentSetup.ai.responsible"), description: <>
                <span className="block">{t("newAgentSetup.ai.forYou", { account: personalDefault?.name ?? t("newAgentSetup.ai.notConnected") })}</span>
                <span className="block">{t("newAgentSetup.ai.otherUsers", { provider: AI_PROVIDERS[requirement.provider].name })}</span>
              </> },
              ...compatible.filter((connection) => connection.ownership === "shared").map((connection) => ({
                id: connection.id, name: connection.name,
                disabled: Boolean(aiConnectionProblem(connection)),
                description: <>{t("newAgentSetup.ai.companyShared")} · {methodLabel(connection.provider, connection.method)}{connection.accountLabel ? ` · ${connection.accountLabel}` : ""}{aiConnectionProblem(connection) ? ` · ${problemLabel(aiConnectionProblem(connection))}` : ""}</>,
              })),
            ]}
            onSelect={(id) => {
              if (id === "responsible_user") onChange({provider: requirement.provider, method: personalDefault?.method ?? requirement.method ?? (requirement.provider === "openrouter" ? "api_key" : "subscription"), mode: "responsible_user"});
              else { const connection = compatible.find((item) => item.id === id)!; select("shared", connection); }
            }}
          />
          {problem && (
            <p role="status" className="text-sm text-destructive">
              {problemLabel(problem)}
            </p>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={onConnect}
            >
              {t("newAgentSetup.ai.connectAnother")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
