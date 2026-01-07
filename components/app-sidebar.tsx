"use client";
import {
  Search,
  Wallet,
  Home,
  LogOut,
  Calendar,
  Brain,
  LayoutGrid,
  ChevronDown,
  StickyNote,
  Code2,
  Zap
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Vault", url: "/dashboard/vault", icon: Search },
  { title: "Finances", url: "/dashboard/finances", icon: Wallet },
  { title: "Office Attendance", url: "/dashboard/attendence", icon: Calendar },
  { title: "Daily Routine", url: "/dashboard/routine", icon: Zap },
];

export function AppSidebar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname(); // Get current URL to highlight tabs

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };
  // Add a settings icon for displaying the selected modules
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {/* Omni Hub Label with Icon */}
          <SidebarGroupLabel className="flex items-center gap-2 mb-2 px-2 text-slate-900 font-bold">
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            <span>Omni Hub</span>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={
                        isActive
                          ? "bg-slate-200 text-slate-900 font-medium"
                          : ""
                      }
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* COLLAPSIBLE BRAIN MODULE */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Quick Notes & Snippets"
                      className={
                        pathname.includes("/dashboard/quick-notes")
                          ? "bg-slate-200"
                          : ""
                      }
                    >
                      <Brain
                        className={
                          pathname.includes("/dashboard/quick-notes")
                            ? "text-black"
                            : ""
                        }
                      />
                      <span>Quick Notes</span>
                      <ChevronDown className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/dashboard/quick-notes/notes"}
                        >
                          <Link href="/dashboard/quick-notes/notes">
                            <StickyNote className="w-4 h-4" />
                            <span>Notes</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={
                            pathname === "/dashboard/quick-notes/snippets"
                          }
                        >
                          <Link href="/dashboard/quick-notes/snippets">
                            <Code2 className="w-4 h-4" />
                            <span>Snippets</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
