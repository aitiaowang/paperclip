// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeLocale } from "@/i18n";
import { ImportSkillsFromProjectDialog } from "./ImportSkillsFromProjectDialog";
import { SkillPolicyDenialNotice, useSkillPolicyDenial } from "@/components/skill-studio/SkillPolicySurfaces";
import { ApiError } from "@/api/client";

const api = vi.hoisted(() => ({ list: vi.fn(), scanProjects: vi.fn(), browseProject: vi.fn(), pushToast: vi.fn() }));
vi.mock("../../api/projects", () => ({ projectsApi: { list: api.list } }));
vi.mock("../../api/companySkills", () => ({ companySkillsApi: { scanProjects: api.scanProjects, browseProject: api.browseProject } }));
vi.mock("../../context/ToastContext", () => ({ useToastActions: () => ({ pushToast: api.pushToast }) }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let client: QueryClient;
beforeEach(() => {
  changeLocale("en"); vi.resetAllMocks();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); changeLocale("zh-CN"); });
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); }
function setInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("keeps project filtering, selected skill and conflict slug while the import dialog changes language", async () => {
  const workspace = { id: "workspace", name: "User workspace", sourceType: "local_path", cwd: "/original/path", isPrimary: true };
  api.list.mockResolvedValue([{ id: "project", name: "Acme project", workspaces: [workspace] }]);
  api.scanProjects.mockResolvedValue({ candidates: [{ name: "User skill", slug: "user-skill", workspaceId: "workspace", workspaceName: "User workspace", relativePath: "skills/raw-name", directoryRoot: "skills", status: "conflict" }], imported: [], updated: [], skipped: [], warnings: [] });
  await act(async () => root.render(<QueryClientProvider client={client}><ImportSkillsFromProjectDialog companyId="company" open onOpenChange={() => {}} /></QueryClientProvider>));
  await settle();
  const projectFilter = document.querySelector<HTMLInputElement>('[data-testid="project-filter"]')!;
  await act(async () => setInput(projectFilter, "Acme"));
  await act(async () => { changeLocale("zh-CN"); });
  expect(document.body.textContent).toContain("从项目导入技能");
  expect(projectFilter.value).toBe("Acme");
  await act(async () => { changeLocale("en"); });
  await act(async () => (document.querySelector('[data-testid="project-row-project"]') as HTMLButtonElement).click());
  await settle();
  const row = document.querySelector<HTMLElement>('[data-testid="candidate-skills/raw-name"]')!;
  await act(async () => row.click());
  const rename = document.querySelector<HTMLInputElement>('input[aria-label="Rename User skill"]')!;
  await act(async () => setInput(rename, "my-preserved-slug"));
  await act(async () => { changeLocale("zh-CN"); });
  expect(document.body.textContent).toContain("导入 1 个技能");
  expect(rename.getAttribute("aria-label")).toBe("重命名 User skill");
  expect(rename.value).toBe("my-preserved-slug");
  expect(row.dataset.selected).toBe("true");
  expect(row.textContent).toContain("skills/raw-name");
  await act(async () => { changeLocale("en"); });
  expect(rename.value).toBe("my-preserved-slug");
  expect(row.dataset.selected).toBe("true");
  expect(api.scanProjects).toHaveBeenCalledExactlyOnceWith("company", { projectIds: ["project"], mode: "preview" });
});

it("retranslates a captured policy banner without recapturing or changing server remediation", async () => {
  function Harness() {
    const controller = useSkillPolicyDenial();
    return <><button onClick={() => controller.capture(new ApiError("denied", 403, { code: "skill_secret_handling_blocked", remediation: "Server instruction 原文" }))}>Capture</button>{controller.denial && <SkillPolicyDenialNotice denial={controller.denial} onDismiss={controller.reset} />}</>;
  }
  await act(async () => root.render(<Harness />));
  await act(async () => host.querySelector("button")!.click());
  expect(host.textContent).toContain("This skill exposes a secret value.");
  await act(async () => { changeLocale("zh-CN"); });
  expect(host.textContent).toContain("此技能暴露了密钥值。");
  expect(host.textContent).toContain("Server instruction 原文");
  await act(async () => { changeLocale("en"); });
  expect(host.textContent).toContain("This skill exposes a secret value.");
  expect(host.textContent).toContain("Server instruction 原文");
});
