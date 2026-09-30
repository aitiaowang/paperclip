// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanySearchResult } from "@paperclipai/shared";
import { changeLocale } from "../../i18n";
import { SearchFilterSheet } from "./SearchFilterSheet";
import { SearchResultRow } from "./SearchResultRow";

vi.mock("@/lib/router", async () => {
  const router = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...router, Link: router.Link };
});

describe("search localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    changeLocale("zh-CN");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    changeLocale("en");
  });

  it("updates an open mobile sheet and keeps draft values when switching languages", async () => {
    const onApply = vi.fn();
    await act(async () => {
      root.render(<SearchFilterSheet
        open onOpenChange={vi.fn()} filters={{ status: ["todo"] }}
        onApply={onApply} onDraftChange={vi.fn()} previewTotal={3}
        data={{ agents: [], projects: [], labels: [], currentUserId: "user-1" }}
        sort="updated" onSortChange={vi.fn()}
      />);
    });
    const sheet = document.querySelector('[data-testid="search-filter-sheet"]')!;
    expect(sheet.textContent).toContain("筛选条件");
    expect(sheet.textContent).toContain("待办");
    expect(sheet.textContent).toContain("显示 3 条结果");
    await act(async () => changeLocale("en"));
    expect(sheet.textContent).toContain("Filters");
    expect(sheet.textContent).toContain("Todo");
    expect(sheet.textContent).toContain("Show 3 results");
    const apply = [...sheet.querySelectorAll("button")].find((button) => button.textContent === "Show 3 results")!;
    await act(async () => apply.click());
    expect(onApply).toHaveBeenCalledWith({ status: ["todo"] });
  });

  it("updates memoized result source labels and time without changing user content", async () => {
    const result = {
      id: "artifact-1", type: "artifact", score: 10, title: "Original English title",
      href: "/issues/PAP-1", matchedFields: ["artifact"], sourceLabel: "Artifact",
      snippet: "Original user content", snippets: [{ field: "artifact", label: "Artifact", text: "Original user content", highlights: [] }],
      updatedAt: new Date().toISOString(), previewImageUrl: null,
      artifact: { id: "artifact-1", source: "document", mediaKind: "document", issueId: "issue-1", issueIdentifier: "PAP-1", issueTitle: "Original issue", projectId: null, projectName: null, updatedAt: new Date().toISOString() },
    } as CompanySearchResult;
    await act(async () => root.render(<MemoryRouter><SearchResultRow result={result} /></MemoryRouter>));
    expect(container.textContent).toContain("产物");
    expect(container.textContent).toContain("刚刚");
    expect(container.textContent).toContain("Original user content");
    await act(async () => changeLocale("en"));
    expect(container.textContent).toContain("Artifact");
    expect(container.textContent).toContain("just now");
    expect(container.textContent).toContain("Original English title");
  });
});
