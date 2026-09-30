import { t } from "@/i18n";
import type { Agent } from "@paperclipai/shared";
import type { CompanyUserProfile } from "./company-members";
import { formatReviewPolicyValue } from "./review-policy";

type ActivityDetails = Record<string, unknown> | null | undefined;

type ActivityParticipant = {
  type: "agent" | "user";
  agentId?: string | null;
  userId?: string | null;
};

type ActivityIssueReference = {
  id?: string | null;
  identifier?: string | null;
  title?: string | null;
};

interface ActivityFormatOptions {
  agentMap?: Map<string, Agent>;
  userProfileMap?: Map<string, CompanyUserProfile>;
  currentUserId?: string | null;
}

const ACTIVITY_ROW_VERBS: Record<string, string> = {
  "issue.created": "auditActivity.row.issue.created",
  "issue.updated": "auditActivity.row.issue.updated",
  "issue.read_marked": "auditActivity.row.issue.read_marked",
  "issue.read_unmarked": "auditActivity.row.issue.read_unmarked",
  "issue.checked_out": "auditActivity.row.issue.checked_out",
  "issue.released": "auditActivity.row.issue.released",
  "issue.comment_added": "auditActivity.row.issue.comment_added",
  "issue.comment_cancelled": "auditActivity.row.issue.comment_cancelled",
  "issue.queued_comment_edited": "auditActivity.row.issue.queued_comment_edited",
  "issue.queued_comments_reordered": "auditActivity.row.issue.queued_comments_reordered",
  "issue.queued_comment_discarded": "auditActivity.row.issue.queued_comment_discarded",
  "issue.comment_deleted": "auditActivity.row.issue.comment_deleted",
  "issue.attachment_added": "auditActivity.row.issue.attachment_added",
  "issue.attachment_removed": "auditActivity.row.issue.attachment_removed",
  "issue.document_created": "auditActivity.row.issue.document_created",
  "issue.document_updated": "auditActivity.row.issue.document_updated",
  "issue.document_locked": "auditActivity.row.issue.document_locked",
  "issue.document_unlocked": "auditActivity.row.issue.document_unlocked",
  "issue.document_deleted": "auditActivity.row.issue.document_deleted",
  "issue.monitor_scheduled": "auditActivity.row.issue.monitor_scheduled",
  "issue.monitor_triggered": "auditActivity.row.issue.monitor_triggered",
  "issue.monitor_cleared": "auditActivity.row.issue.monitor_cleared",
  "issue.monitor_skipped": "auditActivity.row.issue.monitor_skipped",
  "issue.monitor_exhausted": "auditActivity.row.issue.monitor_exhausted",
  "issue.monitor_recovery_wake_queued": "auditActivity.row.issue.monitor_recovery_wake_queued",
  "issue.monitor_recovery_issue_created": "auditActivity.row.issue.monitor_recovery_issue_created",
  "issue.monitor_escalated_to_board": "auditActivity.row.issue.monitor_escalated_to_board",
  "issue.commented": "auditActivity.row.issue.commented",
  "issue.deleted": "auditActivity.row.issue.deleted",
  "issue.successful_run_handoff_required": "auditActivity.row.issue.successful_run_handoff_required",
  "issue.successful_run_handoff_resolved": "auditActivity.row.issue.successful_run_handoff_resolved",
  "issue.successful_run_handoff_escalated": "auditActivity.row.issue.successful_run_handoff_escalated",
  "issue.accepted_plan_decomposition_updated": "auditActivity.row.issue.accepted_plan_decomposition_updated",
  "issue.recovery_action_opened": "auditActivity.row.issue.recovery_action_opened",
  "issue.recovery_action_resolved": "auditActivity.row.issue.recovery_action_resolved",
  "issue.recovery_action_escalated": "auditActivity.row.issue.recovery_action_escalated",
  "agent.created": "auditActivity.row.agent.created",
  "agent.updated": "auditActivity.row.agent.updated",
  "agent.paused": "auditActivity.row.agent.paused",
  "agent.resumed": "auditActivity.row.agent.resumed",
  "agent.error_cleared": "auditActivity.row.agent.error_cleared",
  "agent.terminated": "auditActivity.row.agent.terminated",
  "agent.key_created": "auditActivity.row.agent.key_created",
  "agent.budget_updated": "auditActivity.row.agent.budget_updated",
  "agent.runtime_session_reset": "auditActivity.row.agent.runtime_session_reset",
  "heartbeat.invoked": "auditActivity.row.heartbeat.invoked",
  "heartbeat.cancelled": "auditActivity.row.heartbeat.cancelled",
  "heartbeat.output_stale_source_resolved": "auditActivity.row.heartbeat.output_stale_source_resolved",
  "heartbeat.output_stale_recovery_recursion_refused": "auditActivity.row.heartbeat.output_stale_recovery_recursion_refused",
  "approval.created": "auditActivity.row.approval.created",
  "approval.approved": "auditActivity.row.approval.approved",
  "approval.rejected": "auditActivity.row.approval.rejected",
  // Interaction outcomes (PAP-16506). An agent may now resolve one — including a
  // review of its own work — so these must read as outcomes in the feed instead
  // of falling through to the raw "issue thread interaction accepted" action id.
  // `details.interactionKind` sharpens the wording; see INTERACTION_OUTCOME_LABELS.
  "issue.thread_interaction_created": "auditActivity.row.issue.thread_interaction_created",
  "issue.thread_interaction_accepted": "auditActivity.row.issue.thread_interaction_accepted",
  "issue.thread_interaction_rejected": "auditActivity.row.issue.thread_interaction_rejected",
  "issue.thread_interaction_answered": "auditActivity.row.issue.thread_interaction_answered",
  "issue.thread_interaction_withdrawn": "auditActivity.row.issue.thread_interaction_withdrawn",
  "issue.thread_interaction_cancelled": "auditActivity.row.issue.thread_interaction_cancelled",
  "issue.thread_interaction_skipped": "auditActivity.row.issue.thread_interaction_skipped",
  "issue.thread_interaction_expired": "auditActivity.row.issue.thread_interaction_expired",
  "issue.thread_interaction_item_verdicts_submitted": "auditActivity.row.issue.thread_interaction_item_verdicts_submitted",
  "issue.stalled_review_decided": "auditActivity.row.issue.stalled_review_decided",
  "project.created": "auditActivity.row.project.created",
  "project.updated": "auditActivity.row.project.updated",
  "project.deleted": "auditActivity.row.project.deleted",
  "goal.created": "auditActivity.row.goal.created",
  "goal.updated": "auditActivity.row.goal.updated",
  "goal.deleted": "auditActivity.row.goal.deleted",
  "cost.reported": "auditActivity.row.cost.reported",
  "cost.recorded": "auditActivity.row.cost.recorded",
  "company.created": "auditActivity.row.company.created",
  "company.updated": "auditActivity.row.company.updated",
  "company.archived": "auditActivity.row.company.archived",
  "company.reactivated": "auditActivity.row.company.reactivated",
  "company.budget_updated": "auditActivity.row.company.budget_updated",
  "audit.exported": "auditActivity.row.audit.exported",
  "tool_app.connected": "auditActivity.row.tool_app.connected",
  "tool_app.oauth_connected": "auditActivity.row.tool_app.oauth_connected",
  "tool_app.oauth_failed": "auditActivity.row.tool_app.oauth_failed",
  "tool_app.oauth_access_finalized": "auditActivity.row.tool_app.oauth_access_finalized",
  "tool_app.finished": "auditActivity.row.tool_app.finished",
  "tool_app.reconnected": "auditActivity.row.tool_app.reconnected",
  "tool_connection.created": "auditActivity.row.tool_connection.created",
  "tool_connection.updated": "auditActivity.row.tool_connection.updated",
  "tool_connection.archived": "auditActivity.row.tool_connection.archived",
  "tool_connection.catalog_refresh": "auditActivity.row.tool_connection.catalog_refresh",
  "tool_connection.installs_synced": "auditActivity.row.tool_connection.installs_synced",
  "tool_connection.install_access_extended": "auditActivity.row.tool_connection.install_access_extended",
  "tool_connection.grant_audience_replaced": "auditActivity.row.tool_connection.grant_audience_replaced",
  "tool_connection.grant_added": "auditActivity.row.tool_connection.grant_added",
  "tool_connection.grant_revoked": "auditActivity.row.tool_connection.grant_revoked",
  "tool_connection.grant_delegated": "auditActivity.row.tool_connection.grant_delegated",
  "tool_connection.grant_delegation_revoked": "auditActivity.row.tool_connection.grant_delegation_revoked",
};

const ISSUE_ACTIVITY_LABELS: Record<string, string> = {
  "issue.created": "auditActivity.issue.issue.created",
  "issue.updated": "auditActivity.issue.issue.updated",
  "issue.checked_out": "auditActivity.issue.issue.checked_out",
  "issue.released": "auditActivity.issue.issue.released",
  "issue.comment_added": "auditActivity.issue.issue.comment_added",
  "issue.comment_cancelled": "auditActivity.issue.issue.comment_cancelled",
  "issue.queued_comment_edited": "auditActivity.issue.issue.queued_comment_edited",
  "issue.queued_comments_reordered": "auditActivity.issue.issue.queued_comments_reordered",
  "issue.queued_comment_discarded": "auditActivity.issue.issue.queued_comment_discarded",
  "issue.comment_deleted": "auditActivity.issue.issue.comment_deleted",
  "issue.feedback_vote_saved": "auditActivity.issue.issue.feedback_vote_saved",
  "issue.attachment_added": "auditActivity.issue.issue.attachment_added",
  "issue.attachment_removed": "auditActivity.issue.issue.attachment_removed",
  "issue.document_created": "auditActivity.issue.issue.document_created",
  "issue.document_updated": "auditActivity.issue.issue.document_updated",
  "issue.document_locked": "auditActivity.issue.issue.document_locked",
  "issue.document_unlocked": "auditActivity.issue.issue.document_unlocked",
  "issue.document_deleted": "auditActivity.issue.issue.document_deleted",
  "issue.monitor_scheduled": "auditActivity.issue.issue.monitor_scheduled",
  "issue.monitor_triggered": "auditActivity.issue.issue.monitor_triggered",
  "issue.monitor_cleared": "auditActivity.issue.issue.monitor_cleared",
  "issue.monitor_skipped": "auditActivity.issue.issue.monitor_skipped",
  "issue.monitor_exhausted": "auditActivity.issue.issue.monitor_exhausted",
  "issue.monitor_recovery_wake_queued": "auditActivity.issue.issue.monitor_recovery_wake_queued",
  "issue.monitor_recovery_issue_created": "auditActivity.issue.issue.monitor_recovery_issue_created",
  "issue.monitor_escalated_to_board": "auditActivity.issue.issue.monitor_escalated_to_board",
  "issue.deleted": "auditActivity.issue.issue.deleted",
  "issue.successful_run_handoff_required": "auditActivity.issue.issue.successful_run_handoff_required",
  "issue.successful_run_handoff_resolved": "auditActivity.issue.issue.successful_run_handoff_resolved",
  "issue.successful_run_handoff_escalated": "auditActivity.issue.issue.successful_run_handoff_escalated",
  "issue.cross_issue_influence_cap_rejected": "auditActivity.issue.issue.cross_issue_influence_cap_rejected",
  "issue.cross_issue_influence_observed": "auditActivity.issue.issue.cross_issue_influence_observed",
  "issue.attribution_spoof_rejected": "auditActivity.issue.issue.attribution_spoof_rejected",
  "issue.recovery_action_opened": "auditActivity.issue.issue.recovery_action_opened",
  "issue.recovery_action_resolved": "auditActivity.issue.issue.recovery_action_resolved",
  "issue.recovery_action_escalated": "auditActivity.issue.issue.recovery_action_escalated",
  "issue.accepted_plan_decomposition_updated": "auditActivity.issue.issue.accepted_plan_decomposition_updated",
  "agent.created": "auditActivity.issue.agent.created",
  "agent.updated": "auditActivity.issue.agent.updated",
  "agent.paused": "auditActivity.issue.agent.paused",
  "agent.resumed": "auditActivity.issue.agent.resumed",
  "agent.error_cleared": "auditActivity.issue.agent.error_cleared",
  "agent.terminated": "auditActivity.issue.agent.terminated",
  "heartbeat.invoked": "auditActivity.issue.heartbeat.invoked",
  "heartbeat.cancelled": "auditActivity.issue.heartbeat.cancelled",
  "heartbeat.output_stale_source_resolved": "auditActivity.issue.heartbeat.output_stale_source_resolved",
  "heartbeat.output_stale_recovery_recursion_refused": "auditActivity.issue.heartbeat.output_stale_recovery_recursion_refused",
  "approval.created": "auditActivity.issue.approval.created",
  "approval.approved": "auditActivity.issue.approval.approved",
  "approval.rejected": "auditActivity.issue.approval.rejected",
  "issue.thread_interaction_created": "auditActivity.issue.issue.thread_interaction_created",
  "issue.thread_interaction_accepted": "auditActivity.issue.issue.thread_interaction_accepted",
  "issue.thread_interaction_rejected": "auditActivity.issue.issue.thread_interaction_rejected",
  "issue.thread_interaction_answered": "auditActivity.issue.issue.thread_interaction_answered",
  "issue.thread_interaction_withdrawn": "auditActivity.issue.issue.thread_interaction_withdrawn",
  "issue.thread_interaction_cancelled": "auditActivity.issue.issue.thread_interaction_cancelled",
  "issue.thread_interaction_skipped": "auditActivity.issue.issue.thread_interaction_skipped",
  "issue.thread_interaction_expired": "auditActivity.issue.issue.thread_interaction_expired",
  "issue.thread_interaction_item_verdicts_submitted": "auditActivity.issue.issue.thread_interaction_item_verdicts_submitted",
  "issue.stalled_review_decided": "auditActivity.issue.issue.stalled_review_decided",
};

/**
 * `issue.stalled_review_decided` carries the verb the actor chose, so the line
 * names the verdict ("approved the review") rather than the generic action.
 * Mirrors `StalledReviewDecisionAction` in shared.
 */
const STALLED_REVIEW_DECISION_LABELS: Record<string, string> = {
  approve: "auditActivity.decision.approve",
  request_changes: "auditActivity.decision.request_changes",
  send_back: "auditActivity.decision.send_back",
};

/**
 * `issue.thread_interaction_accepted` / `_rejected` fire for *every* interaction
 * kind, not only for a review. A task suggestion or a question is accepted, not
 * approved, so the kind on the event picks the verb. Kinds absent from a map
 * keep the neutral "accepted the request" wording from the tables above, which
 * is also the fallback for an event that carries no kind.
 */
const INTERACTION_ACCEPTED_LABELS: Record<string, string> = {
  request_confirmation: "auditActivity.accepted.request_confirmation",
  request_checkbox_confirmation: "auditActivity.accepted.request_checkbox_confirmation",
  suggest_tasks: "auditActivity.accepted.suggest_tasks",
  ask_user_questions: "auditActivity.accepted.ask_user_questions",
};

const INTERACTION_REJECTED_LABELS: Record<string, string> = {
  request_confirmation: "auditActivity.rejected.request_confirmation",
  request_checkbox_confirmation: "auditActivity.rejected.request_checkbox_confirmation",
  suggest_tasks: "auditActivity.rejected.suggest_tasks",
  ask_user_questions: "auditActivity.rejected.ask_user_questions",
};

/**
 * Kind-aware wording for an interaction outcome, or `null` when the tables
 * above already say it well enough.
 */
function formatInteractionOutcomeLabel(action: string, details: ActivityDetails): string | null {
  const table = action === "issue.thread_interaction_accepted"
    ? INTERACTION_ACCEPTED_LABELS
    : action === "issue.thread_interaction_rejected"
      ? INTERACTION_REJECTED_LABELS
      : null;
  if (!table) return null;
  const kind = typeof details?.interactionKind === "string" ? details.interactionKind : null;
  return kind && table[kind] ? t(table[kind]) : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function humanizeValue(value: unknown): string {
  if (typeof value !== "string") return String(value ?? t("auditActivity.phrase.none"));
  return t(`statusUi.generic.${value}`, { defaultValue: t(`auditActivity.value.${value}`, { defaultValue: value.replace(/_/g, " ") }) });
}

function isActivityParticipant(value: unknown): value is ActivityParticipant {
  const record = asRecord(value);
  if (!record) return false;
  return record.type === "agent" || record.type === "user";
}

function isActivityIssueReference(value: unknown): value is ActivityIssueReference {
  return asRecord(value) !== null;
}

function readParticipants(details: ActivityDetails, key: string): ActivityParticipant[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityParticipant);
}

function readIssueReferences(details: ActivityDetails, key: string): ActivityIssueReference[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter(isActivityIssueReference);
}

function formatUserLabel(userId: string | null | undefined, options: ActivityFormatOptions = {}): string {
  if (!userId || userId === "local-board") return t("auditActivity.phrase.board");
  if (options.currentUserId && userId === options.currentUserId) return t("auditActivity.phrase.you");
  const profile = options.userProfileMap?.get(userId);
  if (profile) return profile.label;
  return t("auditActivity.phrase.user", { id: userId.slice(0, 5) });
}

function formatParticipantLabel(participant: ActivityParticipant, options: ActivityFormatOptions): string {
  if (participant.type === "agent") {
    const agentId = participant.agentId ?? "";
    return options.agentMap?.get(agentId)?.name ?? t("auditModules.entityLabels.agent");
  }
  return formatUserLabel(participant.userId, options);
}

function formatIssueReferenceLabel(reference: ActivityIssueReference): string {
  if (reference.identifier) return reference.identifier;
  if (reference.title) return reference.title;
  if (reference.id) return reference.id.slice(0, 8);
  return t("auditModules.entityLabels.issue");
}

function formatChangedEntityLabel(
  singular: string,
  plural: string,
  labels: string[],
): string {
  if (labels.length <= 0) return plural;
  if (labels.length === 1) return `${singular} ${labels[0]}`;
  return `${labels.length} ${plural}`;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function readStringArrayLength(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((entry) => typeof entry === "string" && entry.length > 0).length;
}

function formatAcceptedPlanDecompositionDetail(details: ActivityDetails): string | null {
  if (!details) return null;
  const status = typeof details.status === "string" ? details.status : null;
  const requested = readNumber(details.requestedChildCount);
  const totalChildren = readStringArrayLength(details.childIssueIds);
  const newlyCreated = readStringArrayLength(details.newlyCreatedChildIssueIds);
  const reused = Math.max(0, totalChildren - newlyCreated);
  const parts: string[] = [];
  if (newlyCreated > 0) parts.push(t("auditActivity.phrase.createdChildren", { count: newlyCreated }));
  if (reused > 0) parts.push(t("auditActivity.phrase.reusedChildren", { count: reused }));
  if (parts.length === 0 && requested !== null) parts.push(t("auditActivity.phrase.requestedChildren", { count: requested }));
  const summary = parts.length > 0 ? parts.join(", ") : null;
  if (status === "completed" && summary) return t("auditActivity.phrase.decompositionCompleteDetail", { summary });
  if (status === "completed") return t("auditActivity.phrase.decompositionComplete");
  if (status === "in_flight" && summary) return t("auditActivity.phrase.decompositionRunning", { summary });
  return summary;
}

function formatIssueUpdatedVerb(details: ActivityDetails): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  if (details.status !== undefined) {
    const from = previous.status;
    const to = humanizeValue(details.status === "in_review" && details.externalConversationState === "waiting" ? "idle" : details.status);
    return from
      ? t("auditActivity.phrase.statusFrom", { from: humanizeValue(from), to: to })
      : t("auditActivity.phrase.statusTo", { to: to });
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    return from
      ? t("auditActivity.phrase.priorityFrom", { from: humanizeValue(from), to: humanizeValue(details.priority) })
      : t("auditActivity.phrase.priorityTo", { to: humanizeValue(details.priority) });
  }
  return null;
}

function formatAssigneeName(details: ActivityDetails, options: ActivityFormatOptions): string | null {
  if (!details) return null;
  const agentId = details.assigneeAgentId;
  const userId = details.assigneeUserId;
  if (typeof agentId === "string" && agentId) {
    return options.agentMap?.get(agentId)?.name ?? t("auditModules.entityLabels.agent");
  }
  if (typeof userId === "string" && userId) {
    return formatUserLabel(userId, options);
  }
  return null;
}

function formatIssueUpdatedAction(details: ActivityDetails, options: ActivityFormatOptions = {}): string | null {
  if (!details) return null;
  const previous = asRecord(details._previous) ?? {};
  const parts: string[] = [];

  if (details.status !== undefined) {
    const from = previous.status;
    const to = humanizeValue(details.status === "in_review" && details.externalConversationState === "waiting" ? "idle" : details.status);
    parts.push(
      from
        ? t("auditActivity.phrase.statusDetailFrom", { from: humanizeValue(from), to: to })
        : t("auditActivity.phrase.statusDetailTo", { to: to }),
    );
  }
  if (details.priority !== undefined) {
    const from = previous.priority;
    parts.push(
      from
        ? t("auditActivity.phrase.priorityDetailFrom", { from: humanizeValue(from), to: humanizeValue(details.priority) })
        : t("auditActivity.phrase.priorityDetailTo", { to: humanizeValue(details.priority) }),
    );
  }
  if (details.assigneeAgentId !== undefined || details.assigneeUserId !== undefined) {
    const assigneeName = formatAssigneeName(details, options);
    parts.push(assigneeName ? t("auditActivity.phrase.assignee", { name: assigneeName }) : t("auditActivity.phrase.clearAssignee"));
  }
  if (details.reviewPolicy !== undefined) {
    // `null` is the default ("anyone can approve"), so it must not read as
    // "changed the review policy to none" (PAP-16506).
    parts.push(t("auditActivity.phrase.reviewPolicy", { policy: formatReviewPolicyValue(details.reviewPolicy) }));
  }
  if (details.title !== undefined) parts.push(t("auditActivity.phrase.updatedTitle"));
  if (details.description !== undefined) parts.push(t("auditActivity.phrase.updatedDescription"));

  return parts.length > 0 ? parts.join(", ") : null;
}

function formatStructuredIssueChange(input: {
  action: string;
  details: ActivityDetails;
  options: ActivityFormatOptions;
  forIssueDetail: boolean;
}): string | null {
  const details = input.details;
  if (!details) return null;

  if (input.action === "issue.blockers_updated") {
    const added = readIssueReferences(details, "addedBlockedByIssues").map(formatIssueReferenceLabel);
    const removed = readIssueReferences(details, "removedBlockedByIssues").map(formatIssueReferenceLabel);
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel(t("auditActivity.phrase.blocker"), t("auditActivity.phrase.blockers"), added);
      return input.forIssueDetail ? t("auditActivity.phrase.added", { changed }) : t("auditActivity.phrase.addedTo", { changed });
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel(t("auditActivity.phrase.blocker"), t("auditActivity.phrase.blockers"), removed);
      return input.forIssueDetail ? t("auditActivity.phrase.removed", { changed }) : t("auditActivity.phrase.removedFrom", { changed });
    }
    return input.forIssueDetail ? t("auditActivity.phrase.updatedBlockers") : t("auditActivity.phrase.updatedBlockersOn");
  }

  if (input.action === "issue.reviewers_updated" || input.action === "issue.approvers_updated") {
    const added = readParticipants(details, "addedParticipants").map((participant) => formatParticipantLabel(participant, input.options));
    const removed = readParticipants(details, "removedParticipants").map((participant) => formatParticipantLabel(participant, input.options));
    const singular = input.action === "issue.reviewers_updated" ? t("auditActivity.phrase.reviewer") : t("auditActivity.phrase.approver");
    const plural = input.action === "issue.reviewers_updated" ? t("auditActivity.phrase.reviewers") : t("auditActivity.phrase.approvers");
    if (added.length > 0 && removed.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, added);
      return input.forIssueDetail ? t("auditActivity.phrase.added", { changed }) : t("auditActivity.phrase.addedTo", { changed });
    }
    if (removed.length > 0 && added.length === 0) {
      const changed = formatChangedEntityLabel(singular, plural, removed);
      return input.forIssueDetail ? t("auditActivity.phrase.removed", { changed }) : t("auditActivity.phrase.removedFrom", { changed });
    }
    return input.forIssueDetail ? t("auditActivity.phrase.updated", { plural }) : t("auditActivity.phrase.updatedOn", { plural });
  }

  return null;
}

export function formatActivityVerb(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
): string {
  if (action.startsWith("tool_gateway.")) {
    const rawTool = typeof details?.tool === "string"
      ? details.tool
      : typeof details?.upstreamToolName === "string"
        ? details.upstreamToolName
        : t("auditActivity.phrase.appAction");
    const tool = rawTool.replace(/[._-]+/g, " ");
    const isTest = details?.source === "test";
    if (action === "tool_gateway.call_completed") return isTest ? t("auditActivity.phrase.testedTool", { tool }) : t("auditActivity.phrase.usedTool", { tool });
    if (action === "tool_gateway.call_allowed") return isTest ? t("auditActivity.phrase.startedToolTest", { tool }) : t("auditActivity.phrase.allowedTool", { tool });
    if (action === "tool_gateway.call_denied") return t("auditActivity.phrase.blockedTool", { tool });
    if (action === "tool_gateway.approval_requested") return t("auditActivity.phrase.requestedTool", { tool });
    if (action === "tool_gateway.session_created") return t("auditActivity.phrase.openedAppSession");
    if (action === "tool_gateway.session_rejected") return t("auditActivity.phrase.blockedAppSession");
    if (action === "tool_gateway.discovery") return t("auditActivity.phrase.discoveredAppActions");
  }

  if (action === "issue.updated") {
    const issueUpdatedVerb = formatIssueUpdatedVerb(details);
    if (issueUpdatedVerb) return issueUpdatedVerb;
  }

  if (action === "issue.stalled_review_decided") {
    const decision = typeof details?.action === "string" ? details.action : null;
    const label = decision && STALLED_REVIEW_DECISION_LABELS[decision] ? t(STALLED_REVIEW_DECISION_LABELS[decision]) : null;
    if (label) return t("auditActivity.phrase.labelOn", { label });
  }

  const outcomeLabel = formatInteractionOutcomeLabel(action, details);
  if (outcomeLabel) return t("auditActivity.phrase.labelOn", { label: outcomeLabel });

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: false,
  });
  if (structuredChange) return structuredChange;

  return ACTIVITY_ROW_VERBS[action] ? t(ACTIVITY_ROW_VERBS[action]) : action.replace(/[._]/g, " ");
}

export function formatIssueActivityAction(
  action: string,
  details?: Record<string, unknown> | null,
  options: ActivityFormatOptions = {},
): string {
  if (action === "issue.updated") {
    const issueUpdatedAction = formatIssueUpdatedAction(details, options);
    if (issueUpdatedAction) return issueUpdatedAction;
  }

  const structuredChange = formatStructuredIssueChange({
    action,
    details,
    options,
    forIssueDetail: true,
  });
  if (structuredChange) return structuredChange;

  if (action === "issue.accepted_plan_decomposition_updated") {
    const detail = formatAcceptedPlanDecompositionDetail(details);
    if (detail) return detail;
  }

  if (action === "issue.stalled_review_decided") {
    const decision = typeof details?.action === "string" ? details.action : null;
    const label = decision && STALLED_REVIEW_DECISION_LABELS[decision] ? t(STALLED_REVIEW_DECISION_LABELS[decision]) : null;
    if (label) return label;
  }

  const outcomeLabel = formatInteractionOutcomeLabel(action, details);
  if (outcomeLabel) return outcomeLabel;

  if (action.startsWith("issue.monitor_") && details) {
    const serviceName = typeof details.serviceName === "string" && details.serviceName.trim()
      ? details.serviceName.trim()
      : null;
    const base = ISSUE_ACTIVITY_LABELS[action] ? t(ISSUE_ACTIVITY_LABELS[action]) : action.replace(/[._]/g, " ");
    return serviceName ? t("auditActivity.phrase.serviceAction", { base, serviceName }) : base;
  }

  if (
    (
      action === "issue.document_created" ||
      action === "issue.document_updated" ||
      action === "issue.document_locked" ||
      action === "issue.document_unlocked" ||
      action === "issue.document_deleted"
    ) &&
    details
  ) {
    const key = typeof details.key === "string" ? details.key : "document";
    const title = typeof details.title === "string" && details.title ? ` (${details.title})` : "";
    return `${ISSUE_ACTIVITY_LABELS[action] ? t(ISSUE_ACTIVITY_LABELS[action]) : action} ${key}${title}`;
  }

  return ISSUE_ACTIVITY_LABELS[action] ? t(ISSUE_ACTIVITY_LABELS[action]) : action.replace(/[._]/g, " ");
}
