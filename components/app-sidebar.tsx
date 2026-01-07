"use client";

import { useState, useEffect } from "react";
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
  Zap,
  Settings2,
  BookOpen
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export function AppSidebar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  // Added 'notes' to the visibility state
  const [visibleModules, setVisibleModules] = useState({
    finances: true,
    attendance: true,
    routine: true,
    vault: true,
    notes: true,
  });

  useEffect(() => {
    const savedLayout = localStorage.getItem("dashboard-layout");
    if (savedLayout) {
      setVisibleModules(JSON.parse(savedLayout));
    }
  }, []);

  const toggleModule = (module: string) => {
    const nextState = {
      ...visibleModules,
      [module]: !visibleModules[module as keyof typeof visibleModules],
    };
    setVisibleModules(nextState);
    localStorage.setItem("dashboard-layout", JSON.stringify(nextState));
    window.dispatchEvent(new Event("storage"));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { title: "Home", url: "/dashboard", icon: Home, visible: true },
    {
      title: "Vault",
      url: "/dashboard/vault",
      icon: Search,
      visible: visibleModules.vault,
    },
    {
      title: "Finances",
      url: "/dashboard/finances",
      icon: Wallet,
      visible: visibleModules.finances,
    },
    {
      title: "Office Attendance",
      url: "/dashboard/attendence",
      icon: Calendar,
      visible: visibleModules.attendance,
    },
    {
      title: "Daily Routine",
      url: "/dashboard/routine",
      icon: Zap,
      visible: visibleModules.routine,
    },
  ].filter((item) => item.visible);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-4 mt-2">
            <SidebarGroupLabel className="flex items-center gap-2 p-0 text-slate-900 font-bold h-auto">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>Omni Hub</span>
            </SidebarGroupLabel>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-slate-100"
                >
                  <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                className="w-56 p-3 rounded-xl shadow-2xl border-slate-100"
              >
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Configure Pages
                  </p>
                  <TooltipProvider delayDuration={0}>
                    {[
                      { id: "vault", label: "Vault", desc: "Digital Storage" },
                      {
                        id: "finances",
                        label: "Finances",
                        desc: "Money Tracking",
                      },
                      {
                        id: "attendance",
                        label: "Attendance",
                        desc: "Office Logs",
                      },
                      { id: "routine", label: "Routine", desc: "Daily Habits" },
                      {
                        id: "notes",
                        label: "Quick Notes",
                        desc: "Snippets & Brain Dumps",
                      }, // Added to toggle list
                    ].map((mod) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between group hover:bg-slate-50 p-1 rounded-lg transition-colors"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-medium text-slate-700 cursor-help">
                              {mod.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="text-[10px] bg-slate-900"
                          >
                            {mod.desc}
                          </TooltipContent>
                        </Tooltip>
                        <Switch
                          className="scale-75 origin-right"
                          checked={
                            visibleModules[
                              mod.id as keyof typeof visibleModules
                            ]
                          }
                          onCheckedChange={() => toggleModule(mod.id)}
                        />
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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

              {/* Wrapped in visibleModules.notes check */}
              {visibleModules.notes && (
                <Collapsible defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Quick Notes & Snippets">
                        <BookOpen
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
                            isActive={
                              pathname === "/dashboard/quick-notes/notes"
                            }
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
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-destructive hover:bg-red-50"
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

function Button({ className, variant, size, ...props }: any) {
  return <button className={className} {...props} />;
}
