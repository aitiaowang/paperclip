// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { MarkdownEditor, type MarkdownEditorRef } from "./MarkdownEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  changeLocale("zh-CN");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  changeLocale("zh-CN");
});

it("updates the mounted rich editor's accessible label without resetting its draft", async () => {
  const editorRef = createRef<MarkdownEditorRef>();
  const onChange = vi.fn();
  await act(async () => {
    root.render(<MarkdownEditor ref={editorRef} value="Original draft 原文" onChange={onChange} />);
  });
  const editable = host.querySelector<HTMLElement>('[contenteditable="true"]');
  expect(editable?.getAttribute("aria-label")).toBe("Markdown 编辑区");
  await act(async () => { editorRef.current!.insertMarkdown("Unsaved addition 草稿"); });
  expect(editable?.textContent).toContain("Unsaved addition 草稿");
  const draft = editable!.textContent;
  onChange.mockClear();

  await act(async () => { changeLocale("en"); });
  expect(host.querySelector('[contenteditable="true"]')).toBe(editable);
  expect(editable?.getAttribute("aria-label")).toBe("editable markdown");
  expect(editable?.textContent).toBe(draft);
  expect(onChange).not.toHaveBeenCalled();

  await act(async () => { changeLocale("zh-CN"); });
  expect(host.querySelector('[contenteditable="true"]')).toBe(editable);
  expect(editable?.getAttribute("aria-label")).toBe("Markdown 编辑区");
  expect(editable?.textContent).toBe(draft);
  expect(onChange).not.toHaveBeenCalled();
});
