// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CompanySecret } from "@paperclipai/shared";
import { changeLocale } from "../../i18n";
import { SecretPicker } from "./SecretPicker";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  changeLocale("en");
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  changeLocale("en");
});

it("switches an open secret selector while retaining the query and raw secret id", async () => {
  const onSelect = vi.fn();
  const secrets = [{ id: "secret-original-id", key: "API_KEY", name: "team/Release API", status: "active" }] as CompanySecret[];
  flushSync(() => root.render(<SecretPicker secretId="" secrets={secrets} onSelect={onSelect} disablePortal />));
  flushSync(() => host.querySelector<HTMLButtonElement>('button[role="combobox"]')!.click());
  const input = host.querySelector<HTMLInputElement>('input[placeholder="Search secrets…"]')!;
  expect(input).toBeTruthy();
  flushSync(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Release");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await Promise.resolve();
  flushSync(() => changeLocale("zh-CN"));
  expect(host.querySelector<HTMLInputElement>('input[placeholder="搜索密钥…"]')?.value).toBe("Release");
  expect(host.textContent).toContain("team/Release API");
  const option = [...host.querySelectorAll<HTMLElement>("[cmdk-item]")].find(item => item.textContent?.includes("Release API"))!;
  flushSync(() => option.click());
  expect(onSelect).toHaveBeenCalledWith("secret-original-id");
});
