// @vitest-environment node

import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponsibleUserDenialNotice } from "./ResponsibleUserDenialNotice";
import { i18n } from "../i18n";

afterEach(() => { void i18n.changeLanguage("en"); });
beforeEach(() => { void i18n.changeLanguage("en"); });

describe("ResponsibleUserDenialNotice", () => {
  it("translates denial guidance while preserving code, tone, and user names", async () => {
    await i18n.changeLanguage("zh-CN");
    const html = renderToStaticMarkup(<ResponsibleUserDenialNotice code="RESPONSIBLE_USER_UNAVAILABLE" userName="Ada" />);
    expect(html).toContain("责任用户不可用");
    expect(html).toContain("Ada");
    expect(html).toContain("重新指定责任用户");
    expect(html).toContain('data-denial-code="RESPONSIBLE_USER_UNAVAILABLE"');
    expect(html).toContain('data-denial-tone="unavailable"');
  });
  it("renders unauthorized copy that names the responsible user", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAUTHORIZED"
        userName="Ada Lovelace"
      />,
    );

    expect(html).toContain("Responsible user not authorized");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain('data-denial-code="RESPONSIBLE_USER_UNAUTHORIZED"');
    expect(html).toContain('data-denial-tone="unauthorized"');
  });

  it("renders unavailable copy steering toward marking work blocked", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAVAILABLE"
        userName="Grace Hopper"
      />,
    );

    expect(html).toContain("Responsible user unavailable");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain('data-denial-tone="unavailable"');
    expect(html.toLowerCase()).toContain("blocked");
  });

  it("falls back to generic phrasing when the user name is unknown", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice code="RESPONSIBLE_USER_UNAUTHORIZED" />,
    );
    expect(html).toContain("the responsible user");
  });

  it("never uses the word impersonate", () => {
    const html = renderToStaticMarkup(
      <ResponsibleUserDenialNotice
        code="RESPONSIBLE_USER_UNAVAILABLE"
        userName="Someone"
      />,
    );
    expect(html.toLowerCase()).not.toContain("impersonate");
  });
});
