// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const html = fs.readFileSync(path.resolve(import.meta.dirname, "../../index.html"), "utf8");
const guard = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];

afterEach(async () => {
  // Let the existing startup guard detach listeners once React would mount.
  document.getElementById("root")?.appendChild(document.createElement("div"));
  await Promise.resolve();
  vi.useRealTimers();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

describe("startup recovery language", () => {
  it("uses the default Chinese language before the app can load and follows cross-tab changes", () => {
    vi.useFakeTimers();
    window.localStorage.clear();
    document.body.innerHTML = html.match(/<body>([\s\S]*?)<\/body>/)![1];
    window.eval(guard);
    vi.advanceTimersByTime(30_000);
    expect(document.getElementById("paperclip-startup-title")?.textContent).toBe("Paperclip 加载时间较长");
    expect(document.getElementById("paperclip-startup-reload")?.textContent).toBe("刷新页面");
    window.localStorage.setItem("paperclip.ui.locale", "en");
    window.dispatchEvent(new StorageEvent("storage", { key: "paperclip.ui.locale", newValue: "en" }));
    expect(document.getElementById("paperclip-startup-title")?.textContent).toBe("Paperclip is taking longer to load");
    window.dispatchEvent(new ErrorEvent("error"));
    expect(document.getElementById("paperclip-startup-title")?.textContent).toBe("Paperclip couldn’t start");
    expect(document.documentElement.lang).toBe("en");
  });
});
