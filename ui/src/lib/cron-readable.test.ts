import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { changeLocale } from "@/i18n";
import { describeCron } from "./cron-readable";

describe("describeCron", () => {
  it("describes a daily time", () => {
    expect(describeCron("0 14 * * *")).toBe("Every day at 14:00");
  });

  it("describes every-weekday", () => {
    expect(describeCron("0 14 * * 1-5")).toBe("Every weekday at 14:00");
  });

  it("describes a single day-of-week", () => {
    expect(describeCron("30 9 * * 1")).toBe("Every Monday at 09:30");
  });

  it("describes every N minutes", () => {
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
  });

  it("describes hourly on a minute", () => {
    expect(describeCron("5 * * * *")).toBe("Every hour at :05");
  });

  it("returns null for empty or unparseable input", () => {
    expect(describeCron("")).toBeNull();
    expect(describeCron(undefined)).toBeNull();
    expect(describeCron("not a cron")).toBeNull();
    expect(describeCron("1 2 3")).toBeNull();
  });

  it("uses the current language without changing cron semantics", () => {
    changeLocale("zh-CN");
    expect(describeCron("30 9 * * 1")).toBe("每周一 09:30");
    expect(describeCron("*/15 * * * *")).toBe("每 15 分钟");
    expect(describeCron("not a cron")).toBeNull();
    changeLocale("en");
    expect(describeCron("30 9 * * 1")).toBe("Every Monday at 09:30");
  });
});

beforeEach(() => { changeLocale("en"); });
afterEach(() => { changeLocale("zh-CN"); });
