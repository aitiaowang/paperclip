import { t } from "@/i18n";
import {
  codexLocalReasoningEffortsForModel,
  type CodexLocalReasoningEffort,
} from "@paperclipai/adapter-codex-local";

const CODEX_REASONING_EFFORT_LABELS: Record<CodexLocalReasoningEffort, string> = {
  get minimal() { return t("runtimeModules.optionMinimal"); },
  get low() { return t("runtimeModules.optionLow"); },
  get medium() { return t("runtimeModules.optionMedium"); },
  get high() { return t("runtimeModules.optionHigh"); },
  get xhigh() { return t("runtimeModules.optionXHigh"); },
  get max() { return t("runtimeModules.optionMax"); },
  get ultra() { return t("runtimeModules.optionUltra"); },
};

export function codexReasoningEffortOptions(
  model: string | null | undefined,
  defaultLabel = t("runtimeModules.default"),
) {
  return [
    { value: "", label: defaultLabel },
    ...codexLocalReasoningEffortsForModel(model).map((value) => ({
      value,
      label: CODEX_REASONING_EFFORT_LABELS[value],
    })),
  ];
}
