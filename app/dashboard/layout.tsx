import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        {/* The SidebarTrigger is the button that opens the menu on mobile */}
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h2 className="text-sm font-semibold">Dashboard</h2>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
