// @vitest-environment jsdom
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { AgentPermissions } from "@paperclipai/shared";
import { TrustPresetSection } from "./TrustPresetSection";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "../i18n";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
beforeEach(() => { void i18n.changeLanguage("en"); });

function renderSection(permissions: Partial<AgentPermissions>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const onChange = vi.fn();
  const createdRoot = createRoot(container);
  root = createdRoot;
  act(() => {
    createdRoot.render(
      <TooltipProvider>
        <TrustPresetSection
          permissions={permissions}
          onChange={onChange}
          companyId="company-1"
          projectCandidates={[{ id: "project-1", label: "Paperclip App" }]}
          issueCandidates={[{ id: "issue-1", label: "PAP-1 · Review PR" }]}
        />
      </TooltipProvider>,
    );
  });
  return { onChange, text: () => container?.textContent ?? "" };
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  root = null;
  container = null;
  void i18n.changeLanguage("en");
});

describe("TrustPresetSection", () => {
  it("switches mounted copy without changing preset values or permission payloads", () => {
    const view = renderSection({ canCreateAgents: true, trustPreset: "standard" });
    const select = container!.querySelector("select")!;
    expect(view.text()).toContain("Trust preset");
    act(() => { void i18n.changeLanguage("zh-CN"); });
    expect(view.text()).toContain("信任预设");
    expect(view.text()).toContain("标准");
    expect(view.text()).toContain("组织内可见的协作");
    expect(select.value).toBe("standard");
    expect(view.onChange).not.toHaveBeenCalled();
    act(() => {
      select.value = "low_trust_review";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const chinesePayload = view.onChange.mock.calls[0][0];
    act(() => { void i18n.changeLanguage("en"); });
    expect(view.text()).toContain("Trust preset");
    act(() => {
      select.value = "low_trust_review";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.onChange.mock.calls[1][0]).toEqual(chinesePayload);
    expect(chinesePayload).toMatchObject({ canCreateAgents: false, trustPreset: "low_trust_review", authorizationPolicy: { reviewPreset: { id: "low_trust_review", version: 1, rawOutputDisposition: "quarantine" } } });
  });
  it("hides the CE boundary editor under Standard", () => {
    const view = renderSection({ canCreateAgents: false, trustPreset: "standard" });

    expect(view.text()).toContain("Trust preset");
    expect(view.text()).not.toContain("Boundary type");
    expect(view.text()).not.toContain("Get Paperclip EE.");
  });

  it("shows a selectable CE boundary editor for low-trust review", () => {
    const view = renderSection({
      canCreateAgents: false,
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustPreset: "low_trust_review",
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          projectIds: ["project-1"],
        },
      },
    });

    expect(view.text()).toContain("Containment active");
    expect(view.text()).toContain("Boundary type");
    expect(view.text()).toContain("Paperclip App");
    expect(view.text()).toContain("Get Paperclip EE.");
    expect(view.text()).not.toContain("Managed by EE/API");
  });

  it("renders multi-boundary policies as read-only", () => {
    const view = renderSection({
      canCreateAgents: false,
      trustPreset: "low_trust_review",
      authorizationPolicy: {
        trustPreset: "low_trust_review",
        trustBoundary: {
          mode: "low_trust_review",
          companyId: "company-1",
          projectIds: ["project-1", "project-2"],
        },
      },
    });

    expect(view.text()).toContain("Managed by EE/API");
    expect(view.text()).toContain("2 boundaries");
    expect(view.text()).not.toContain("Clear boundary");
  });
});
