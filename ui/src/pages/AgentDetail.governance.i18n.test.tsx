// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { AgentDetail as AgentDetailRecord } from "@paperclipai/shared";
import { changeLocale } from "../i18n";
import { ConfigurationTab, KeysTab, AgentRevisionsTab } from "./AgentDetail";
import { queryKeys } from "../lib/queryKeys";
vi.mock("../api/agents", () => ({agentsApi:{listKeys:vi.fn(async()=>[]),configRevisions:vi.fn(async()=>[])}}));
vi.mock("@/lib/router", () => ({useNavigate:()=>vi.fn(),useParams:()=>({})}));
vi.mock("../context/ToastContext", () => ({useToastActions:()=>({pushToast:vi.fn()})}));
vi.mock("../components/TrustPresetSection", () => ({TrustPresetSection:()=>null}));
afterEach(()=>changeLocale("en"));
it("reactively translates permissions without changing grants", async()=>{
 const host=document.createElement("div"); const root=createRoot(host); const client=new QueryClient(); const mutate=vi.fn();
 const agent={id:"agent-1",role:"researcher",adapterType:"codex_local",adapterConfig:{},permissions:{canCreateAgents:false,canCreateSkills:true},access:{canAssignTasks:true,taskAssignSource:"explicit_grant"}} as AgentDetailRecord;
 try {
  changeLocale("en");
  await act(async()=>root.render(<QueryClientProvider client={client}><ConfigurationTab agent={agent} content="permissions" onDirtyChange={()=>{}} onSaveActionChange={()=>{}} onCancelActionChange={()=>{}} onSavingChange={()=>{}} updatePermissions={{mutate,isPending:false}} /></QueryClientProvider>));
  expect(host.textContent).toContain("Can create new agents");
  const switches=()=>Array.from(host.querySelectorAll('[role="switch"]')).map(el=>el.getAttribute("aria-checked"));
  const grants=switches();
  expect(grants).toHaveLength(3);
  await act(async()=>changeLocale("zh-CN"));
  expect(host.textContent).toContain("允许创建员工");
  expect(host.textContent).toContain("已通过组织的明确授权启用。");
  expect(switches()).toEqual(grants);expect(mutate).not.toHaveBeenCalled();
  await act(async()=>changeLocale("en"));expect(host.textContent).toContain("Can assign tasks");
 } finally {await act(async()=>root.unmount());client.clear();}
});

it("switches API key and revision empty-state labels without creating or restoring data", async()=>{
 const host=document.createElement("div");const root=createRoot(host);const client=new QueryClient({defaultOptions:{queries:{staleTime:Infinity}}});
 client.setQueryData(queryKeys.agents.keys("agent-1"),[]);
 client.setQueryData(queryKeys.agents.configRevisions("agent-1"),[]);
 const agent={id:"agent-1",name:"Researcher",urlKey:"researcher"} as AgentDetailRecord;
 try {
  changeLocale("en");
  await act(async()=>root.render(<QueryClientProvider client={client}><KeysTab agentId="agent-1"/><AgentRevisionsTab agent={agent}/></QueryClientProvider>));
  expect(host.textContent).toContain("Create API Key");
  await act(async()=>changeLocale("zh-CN"));
  expect(host.textContent).toContain("创建 API 密钥");
  expect(host.textContent).toContain("暂无有效的 API 密钥。");
  expect(host.textContent).toContain("暂无配置修订记录。");
  await act(async()=>changeLocale("en"));
  expect(host.textContent).toContain("No configuration revisions yet.");
 } finally {await act(async()=>root.unmount());client.clear();}
});
