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
];

export function AppSidebar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname(); // Get current URL to highlight tabs

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
                      tooltip="Brain"
                      className={
                        pathname.includes("/dashboard/brain")
                          ? "bg-slate-200"
                          : ""
                      }
                    >
                      <Brain
                        className={
                          pathname.includes("/dashboard/brain")
                            ? "text-black"
                            : ""
                        }
                      />
                      <span>Brain</span>
                      <ChevronDown className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/dashboard/brain/notes"}
                        >
                          <Link href="/dashboard/brain/notes">
                            <StickyNote className="w-4 h-4" />
                            <span>Quick Notes</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === "/dashboard/brain/snippets"}
                        >
                          <Link href="/dashboard/brain/snippets">
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
