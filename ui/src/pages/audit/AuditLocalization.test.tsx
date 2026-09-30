// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetPolicySummary } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { BudgetPolicyCard } from "@/components/BudgetPolicyCard";
import { FinanceTimelineCard } from "@/components/FinanceTimelineCard";
import { formatActivityVerb } from "@/lib/activity-format";
import { billingTypeDisplayName, financeEventKindDisplayName } from "@/lib/utils";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("audit language switching", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("updates mounted budget and finance labels while retaining the same editable budget", async () => {
    const onSave = vi.fn();
    const summary: BudgetPolicySummary = {
      policyId: "policy-1", scopeType: "agent", scopeId: "agent-1", scopeName: "Fable",
      amount: 10000, observedAmount: 2500, remainingAmount: 7500, utilizationPercent: 25,
      warnPercent: 80, status: "ok", paused: false, windowKind: "calendar_month_utc",
      companyId: "company-1", metric: "billed_cents", hardStopEnabled: true, notifyEnabled: true,
      isActive: true, pauseReason: null, windowStart: new Date("2026-09-01"), windowEnd: new Date("2026-10-01"),
    };
    await act(async () => {
      root.render(<><BudgetPolicyCard summary={summary} onSave={onSave} /><FinanceTimelineCard rows={[]} /></>);
    });
    const input = container.querySelector("input")!;
    expect(input.value).toBe("100.00");
    expect(container.textContent).toContain("Monthly UTC budget");
    expect(container.textContent).toContain("No financial events in this period.");
    await act(async () => { await i18n.changeLanguage("zh-CN"); });
    expect(container.textContent).toContain("UTC 月度预算");
    expect(container.textContent).toContain("此期间没有财务事件。");
    expect(container.textContent).toContain("Fable");
    expect(container.querySelector("input")).toBe(input);
    expect(input.value).toBe("100.00");
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Monthly UTC budget");
  });

  it("translates action phrases at call time without translating user data or protocol values", async () => {
    expect(formatActivityVerb("issue.updated", { status: "done", _previous: { status: "in_progress" } }))
      .toBe("changed status from in progress to done on");
    expect(billingTypeDisplayName("metered_api")).toBe("Metered API");
    await i18n.changeLanguage("zh-CN");
    expect(formatActivityVerb("issue.comment_added")).toBe("评论了");
    expect(formatActivityVerb("tool_gateway.call_completed", { tool: "custom_tool", source: "test" }))
      .toBe("测试了 custom tool，关联");
    expect(formatActivityVerb("unknown.custom_action")).toBe("unknown custom action");
    expect(billingTypeDisplayName("metered_api")).toBe("按量计费 API");
    expect(financeEventKindDisplayName("platform_fee")).toBe("平台费");
  });
});
