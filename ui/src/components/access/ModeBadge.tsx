import { useTranslation } from "@/i18n";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";

export function ModeBadge({
  deploymentMode,
  deploymentExposure,
}: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
}) {
  const { t } = useTranslation();
  if (!deploymentMode) return null;

  const label =
    deploymentMode === "local_trusted"
      ? t("settingsUi.localTrusted")
      : t(deploymentExposure === "public" ? "settingsUi.authenticatedPublic" : "settingsUi.authenticatedPrivate");

  return <Badge variant="outline">{label}</Badge>;
}
