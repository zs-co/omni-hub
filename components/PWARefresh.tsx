"use client";

import React from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function PWARefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleRefresh = async () => {
    // This tells Next.js to re-run server components and clear data cache
    router.refresh();
    // Simulate a tiny delay for the "feel"
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex justify-center p-4 text-slate-400 gap-2 items-center text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Pull to refresh
        </div>
      }
      refreshingContent={
        <div className="flex justify-center p-4 text-gray-500 gap-2 items-center text-sm font-bold">
          <RefreshCw className="w-4 h-4 animate-spin" /> Updating ...
        </div>
      }
    >
      <div className="min-h-screen">{children}</div>
    </PullToRefresh>
  );
}
