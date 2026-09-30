import { Children, isValidElement, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebar } from "../context/SidebarContext";
import { useTranslation } from "../i18n";

export interface PageTabItem {
  value: string;
  label: ReactNode;
  /** Plain text for the native mobile selector when the desktop label is rich content. */
  mobileLabel?: string;
}

function tabLabelText(label: ReactNode): string {
  return Children.toArray(label).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? tabLabelText(child.props.children) : "";
  }).filter(Boolean).join(" ");
}

interface PageTabBarProps {
  items: readonly PageTabItem[];
  value?: string;
  onValueChange?: (value: string) => void;
  align?: "center" | "start";
}

export function PageTabBar({ items, value, onValueChange, align = "center" }: PageTabBarProps) {
  const { isMobile } = useSidebar();
  const { t } = useTranslation();

  if (isMobile && value !== undefined && onValueChange) {
    return (
      <div className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="h-9 appearance-none rounded-md border border-border bg-background pl-3 pr-9 py-1 text-base focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("searchUi.pageSection")}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.mobileLabel ?? tabLabelText(item.label)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <TabsList variant="line" className={align === "start" ? "justify-start" : undefined}>
      {items.map((item) => (
        <TabsTrigger key={item.value} value={item.value}>
          {item.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
