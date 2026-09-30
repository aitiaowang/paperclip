import { useTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accessApi } from "@/api/access";
import { queryKeys } from "@/lib/queryKeys";
import { buildAgentOnboardingPrompt } from "@/lib/agent-onboarding-prompt";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

/** Preserve the existing agent-only invitation path beside the setup wizard. */
export function ExternalAgentInviteDialog({ companyId, onClose, onBack }: {
  companyId: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy(value: string) {
    try {
      await copyTextToClipboard(value);
      if (mounted.current) { setCopied(true); setCopyError(false); }
    } catch {
      if (mounted.current) setCopyError(true);
    }
  }
  const createInvite = useMutation({
    mutationFn: async () => {
      const invite = await accessApi.createCompanyInvite(companyId, {
        allowedJoinTypes: "agent",
        humanRole: null,
        agentMessage: message.trim() || null,
      });
      void cache.invalidateQueries({ queryKey: queryKeys.access.invites(companyId, "all", 5) });
      const path = invite.onboardingTextUrl ?? invite.onboardingTextPath ?? `/api/invites/${invite.token}/onboarding.txt`;
      const onboardingTextUrl = new URL(path, window.location.origin).href;
      const manifest = await accessApi.getInviteOnboarding(invite.token).catch(() => null);
      return buildAgentOnboardingPrompt({
        onboardingTextUrl,
        connectionCandidates: manifest?.onboarding.connectivity?.connectionCandidates ?? null,
        testResolutionUrl: manifest?.onboarding.connectivity?.testResolutionEndpoint?.url ?? null,
      });
    },
    onSuccess: async (value) => {
      if (!mounted.current) return;
      setPrompt(value);
      await copy(value);
    },
  });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-(--sz-calc-16) overflow-y-auto sm:max-w-2xl">
      <DialogTitle>{prompt ? t("newAgentConnection.promptTitle") : t("newAgentConnection.inviteTitle")}</DialogTitle>
      <DialogDescription>
        {prompt ? t("newAgentConnection.sendPrompt")
          : t("newAgentConnection.inviteDescription")}
      </DialogDescription>
      {prompt ? <>
        <Textarea aria-label={t("newAgentConnection.promptTitle")} readOnly value={prompt} className="min-h-64 font-mono text-xs" />
        {copyError && <p role="alert" className="text-sm text-muted-foreground">{t("newAgentConnection.clipboardUnavailable")}</p>}
        <div className="flex justify-between gap-4">
          <Button variant="ghost" onClick={onClose}>{t("newAgentConnection.done")}</Button>
          <Button variant="outline" onClick={() => void copy(prompt)}>{copied ? t("newAgentConnection.copiedPrompt") : t("newAgentConnection.copyPrompt")}</Button>
        </div>
      </> : <>
        <label className="space-y-2 text-sm">
          <span>{t("newAgentConnection.optionalMessage")}</span>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} className="min-h-24" />
        </label>
        {createInvite.error && <p role="alert" className="text-sm text-destructive">{createInvite.error.message}</p>}
        <div className="flex justify-between gap-4">
          <Button variant="ghost" onClick={onBack}>{t("newAgentConnection.back")}</Button>
          <Button disabled={createInvite.isPending} onClick={() => createInvite.mutate()}>
            {createInvite.isPending ? t("newAgentConnection.generating") : t("newAgentConnection.generatePrompt")}
          </Button>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
