// @vitest-environment jsdom

import type React from "react";
import { changeLocale } from "../i18n";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoutineSaveBar } from "./RoutineSaveBar";
import type { RoutineHistoryDirtyFieldDescriptor } from "./RoutineHistoryTab";

function act(callback: () => void) {
  flushSync(callback);
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  changeLocale("en");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const DIRTY: RoutineHistoryDirtyFieldDescriptor[] = [
  { key: "title", label: "the title" },
  { key: "description", label: "the description" },
];

function renderBar(props: Partial<React.ComponentProps<typeof RoutineSaveBar>>) {
  const handlers = {
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onReload: vi.fn(),
  };
  act(() => {
    root.render(
      <RoutineSaveBar
        dirtyFields={props.dirtyFields ?? []}
        isSaving={props.isSaving ?? false}
        saveConflict={props.saveConflict ?? false}
        onSave={props.onSave ?? handlers.onSave}
        onDiscard={props.onDiscard ?? handlers.onDiscard}
        onReload={props.onReload ?? handlers.onReload}
      />,
    );
  });
  return handlers;
}

describe("RoutineSaveBar", () => {
  it("renders nothing when clean and no conflict", () => {
    renderBar({ dirtyFields: [] });
    expect(container.textContent).toBe("");
  });

  it("shows the unsaved change count when dirty", () => {
    renderBar({ dirtyFields: DIRTY });
    expect(container.textContent).toContain("2 unsaved changes");
  });

  it("invokes onSave on Cmd/Ctrl+S while dirty", () => {
    const handlers = renderBar({ dirtyFields: DIRTY });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
    });
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onSave on Cmd+S when clean", () => {
    const handlers = renderBar({ dirtyFields: [] });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true }));
    });
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it("surfaces the conflict recovery actions on saveConflict", () => {
    const handlers = renderBar({ dirtyFields: DIRTY, saveConflict: true });
    expect(container.textContent).toContain("Routine changed elsewhere");
    const buttons = Array.from(container.querySelectorAll("button"));
    const reload = buttons.find((button) => button.textContent?.includes("Reload latest"));
    const overwrite = buttons.find((button) => button.textContent?.includes("Overwrite anyway"));
    expect(reload).toBeTruthy();
    expect(overwrite).toBeTruthy();
    act(() => {
      reload!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(handlers.onReload).toHaveBeenCalledTimes(1);
  });
  it("switches an open discard dialog without discarding pending changes", () => {
    const handlers = renderBar({ dirtyFields: DIRTY });
    const discard = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "Discard")!;
    act(() => discard.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("Discard changes?");
    act(() => changeLocale("zh-CN"));
    expect(document.body.textContent).toContain("放弃更改？");
    expect(document.body.textContent).toContain("2 项未保存更改");
    expect(handlers.onDiscard).not.toHaveBeenCalled();
    const keep = Array.from(document.querySelectorAll("button")).find(button => button.textContent === "继续编辑")!;
    act(() => keep.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => changeLocale("en"));
    expect(container.textContent).toContain("2 unsaved changes");
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", metaKey: true })));
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });
});
