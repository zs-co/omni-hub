import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Search, Wallet, Calendar, Brain, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-[calc(100vh-120px)]">
      {/* 1. Large Feature: Vault (Spans 2 columns) */}
      <Link href="/dashboard/vault" className="md:col-span-2 md:row-span-1">
        <Card className="h-full hover:bg-slate-50 transition-colors border-blue-100">
          <CardHeader>
            <Search className="w-8 h-8 text-blue-500 mb-2" />
            <CardTitle>Vault</CardTitle>
            <CardDescription>
              Instantly find where you put your passport, tools, or keys.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* 2. Medium Feature: Finances */}
      <Link href="/dashboard/finances" className="md:col-span-2">
        <Card className="h-full hover:bg-slate-50 transition-colors border-green-100">
          <CardHeader>
            <Wallet className="w-8 h-8 text-green-500 mb-2" />
            <CardTitle>Money Flow</CardTitle>
            <CardDescription>
              Track daily burn rate and subscriptions.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* 3. Small Feature: Brain */}
      <Link href="/dashboard/brain" className="md:col-span-1">
        <Card className="h-full hover:bg-slate-50 transition-colors border-purple-100">
          <CardHeader>
            <Brain className="w-8 h-8 text-purple-500 mb-2" />
            <CardTitle>Brain</CardTitle>
            <CardDescription>Snippets & Decisions.</CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* 4. Small Feature: Time Off */}
      <Link href="/dashboard/leaves" className="md:col-span-1">
        <Card className="h-full hover:bg-slate-50 transition-colors border-orange-100">
          <CardHeader>
            <Calendar className="w-8 h-8 text-orange-500 mb-2" />
            <CardTitle>Time Off</CardTitle>
            <CardDescription>Holiday balance.</CardDescription>
          </CardHeader>
        </Card>
      </Link>

      {/* 5. Wide Feature: Routine (Spans 2 columns) */}
      <Link href="/dashboard/routine" className="md:col-span-2">
        <Card className="h-full hover:bg-slate-50 transition-colors border-pink-100">
          <CardHeader className="flex flex-row items-center gap-4">
            <CheckCircle className="w-8 h-8 text-pink-500" />
            <div>
              <CardTitle>Daily Routine</CardTitle>
              <CardDescription>Current Phase: Morning</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
