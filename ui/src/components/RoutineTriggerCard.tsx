import { getLocale, useTranslation } from "../i18n";
import { useEffect, useState } from "react";
import { Clock3, RefreshCw, Save, Trash2, Webhook, Zap } from "lucide-react";
import type { RoutineTrigger } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleEditor } from "./ScheduleEditor";
import { buildRoutineTriggerPatch } from "../lib/routine-trigger-patch";
import { describeCron } from "../lib/cron-readable";

const signingModes = ["app_webhook", "bearer", "hmac_sha256", "github_hmac", "none"];
const SIGNING_MODES_WITHOUT_REPLAY_WINDOW = new Set(["app_webhook", "bearer", "github_hmac", "fireflies_hmac", "none"]);
const RESULT_KEYS: Record<string, string> = {
  "Coalesced into an existing live execution issue": "routineDetailUi.result.coalesced",
  "Skipped because the project is paused": "routineDetailUi.result.paused",
  "Skipped because a live execution issue already exists": "routineDetailUi.result.skipped",
  "Execution issue completed": "routineDetailUi.result.completed",
  "Execution failed": "routineDetailUi.result.failed",
};

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Single trigger card with its own field-edit + save state (§3.2). Extracted
 * from the previous inline `TriggerEditor` in `RoutineDetail.tsx` — same logic.
 */
export function RoutineTriggerCard({
  trigger,
  onSave,
  onRotate,
  onDelete,
  disabled,
}: {
  trigger: RoutineTrigger;
  onSave: (id: string, patch: Record<string, unknown>) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    label: trigger.label ?? "",
    cronExpression: trigger.cronExpression ?? "",
    signingMode: trigger.signingMode ?? "bearer",
    replayWindowSec: String(trigger.replayWindowSec ?? 300),
  });

  useEffect(() => {
    setDraft({
      label: trigger.label ?? "",
      cronExpression: trigger.cronExpression ?? "",
      signingMode: trigger.signingMode ?? "bearer",
      replayWindowSec: String(trigger.replayWindowSec ?? 300),
    });
  }, [trigger]);

  const KindIcon =
    trigger.kind === "schedule" ? Clock3 : trigger.kind === "webhook" ? Webhook : Zap;
  const humanCron = trigger.kind === "schedule" ? describeCron(draft.cronExpression) : null;
  const lastResultFailed = /fail|error/i.test(trigger.lastResult ?? "");
  const lastResultLabel = trigger.lastResult?.startsWith("Created execution issue ")
    ? t("routineDetailUi.taskCreated")
    : trigger.lastResult
      ? t(RESULT_KEYS[trigger.lastResult] ?? `statusUi.generic.${trigger.lastResult}`, { defaultValue: trigger.lastResult })
      : null;

  return (
    <form
      aria-label={t("routineDetailUi.triggerName", { label: trigger.label ?? t(`routineDetailUi.kind.${trigger.kind}`) })}
      className="space-y-4 rounded-lg border border-border p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KindIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trigger.label ?? t(`routineDetailUi.kind.${trigger.kind}`)}</span>
          </div>
          {humanCron ? (
            <p id={`cron-readable-${trigger.id}`} className="text-xs text-muted-foreground">
              {humanCron}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {trigger.lastResult ? (
            <Badge variant={lastResultFailed ? "destructive" : "secondary"}>
              {lastResultLabel}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {trigger.kind === "schedule" && trigger.nextRunAt
              ? t("routineDetailUi.nextTime", { time: new Date(trigger.nextRunAt).toLocaleString(getLocale()) })
              : trigger.kind === "webhook"
                ? "Webhook"
                : "API"}
          </span>
        </div>
      </div>

      {trigger.kind === "webhook" && trigger.webhookUrl && (
        <div className="space-y-1.5">
          <Label htmlFor={`webhook-url-${trigger.id}`} className="text-xs">{t("routineDetailUi.webhookUrl")}</Label>
          <Input id={`webhook-url-${trigger.id}`} value={trigger.webhookUrl} readOnly onFocus={(event) => event.target.select()} />
          <p className="text-xs text-muted-foreground">
            {t("routineDetailUi.webhookHelp")}
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("routineDetailUi.triggerLabel")}</Label>
          <Input
            value={draft.label}
            disabled={disabled}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
        </div>
        {trigger.kind === "schedule" && (
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">{t("routineDetailUi.scheduleLabel")}</Label>
            <ScheduleEditor
              value={draft.cronExpression}
              onChange={(cronExpression) =>
                setDraft((current) => ({ ...current, cronExpression }))
              }
            />
          </div>
        )}
        {trigger.kind === "webhook" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("routineDetailUi.signingMode")}</Label>
              <Select
                value={draft.signingMode}
                onValueChange={(signingMode) =>
                  setDraft((current) => ({ ...current, signingMode }))
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {signingModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {t(`routineDetailUi.signing.${mode}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!SIGNING_MODES_WITHOUT_REPLAY_WINDOW.has(draft.signingMode) && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("routineDetailUi.replayWindow")}</Label>
                <Input
                  value={draft.replayWindowSec}
                  disabled={disabled}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, replayWindowSec: event.target.value }))
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(trigger.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("routineDetailUi.delete")}
          </Button>
          {trigger.kind === "webhook" && (
            <Button variant="outline" size="sm" onClick={() => onRotate(trigger.id)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("routineDetailUi.rotate")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onSave(trigger.id, buildRoutineTriggerPatch(trigger, draft, getLocalTimezone()))
            }
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {t("routineDetailUi.saveTrigger")}
          </Button>
        </div>
      )}
    </form>
  );
}
