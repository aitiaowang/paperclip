import { t, useTranslation } from "@/i18n";
import type { ProviderTraceMetadata } from "@paperclipai/shared";
import { Bug, CircleOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function runRequestedProviderTrace(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (!contextSnapshot) return false;
  const debug = contextSnapshot.debug;
  return (
    typeof debug === "object" &&
    debug !== null &&
    !Array.isArray(debug) &&
    (debug as Record<string, unknown>).providerTrace === "raw"
  );
}

export function ProviderTraceStatusBadge({
  trace,
  requested = false,
  showOff = false,
  className,
}: {
  trace?: ProviderTraceMetadata | null;
  requested?: boolean;
  showOff?: boolean;
  className?: string;
}) {
  useTranslation();
  const status = trace?.status;
  const expired = trace
    ? new Date(trace.expiresAt).getTime() <= Date.now()
    : false;
  const label = expired
    ? t("runDependencies.copy0")
    : status === "capturing"
      ? t("runDependencies.copy1")
      : status === "complete"
        ? t("runDependencies.copy2")
        : status === "incomplete"
          ? t("runDependencies.copy3")
          : status === "truncated"
            ? t("runDependencies.copy4")
            : status === "expired"
              ? t("runDependencies.copy5")
              : status === "deleted"
                ? t("runDependencies.copy6")
                : requested
                  ? t("runDependencies.copy7")
                  : showOff
                    ? t("runDependencies.copy8")
                    : null;
  if (!label) return null;
  const warning =
    status === "incomplete" ||
    status === "truncated" ||
    status === "expired" ||
    status === "deleted" ||
    expired;
  const off = !expired && !["capturing", "complete", "incomplete", "truncated", "expired", "deleted"].includes(status ?? "") && !requested && showOff;
  const muted = off || status === "deleted" || status === "expired" || expired;
  const Icon = off ? CircleOff : Bug;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
        muted
          ? "border-border bg-background text-muted-foreground"
          : warning
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        className,
      )}
      title={
        trace
          ? t("runDependencies.traceSummary", { frames: trace.frameCount, bytes: trace.byteCount, date: new Date(trace.expiresAt).toLocaleString() })
          : requested
            ? t("runDependencies.copy13")
            : t("runDependencies.copy14")
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
