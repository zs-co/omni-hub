"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import {
  Wallet,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  parseISO,
  getYear,
  eachDayOfInterval,
  subDays,
} from "date-fns";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardHome() {
  const supabase = createClient();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Visibility state controlled by Sidebar
  const [visibleModules, setVisibleModules] = useState({
    finances: true,
    attendance: true,
    routine: true,
  });

  useEffect(() => {
    const fetchAllData = async () => {
      // 1. Immediate Layout Load (Prevents UI jump)
      const savedLayout = localStorage.getItem("dashboard-layout");
      if (savedLayout) setVisibleModules(JSON.parse(savedLayout));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const weekAgo = subDays(new Date(), 7).toISOString();

      // 2. PARALLEL FETCHING (The Speed Booster)
      // All these requests fire at once instead of waiting for each other
      const [attRes, balRes, taskRes, logRes, finRes] = await Promise.all([
        supabase.from("attendance").select("*"),
        supabase
          .from("leave_balances")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase.from("routine_tasks").select("*"),
        supabase
          .from("routine_logs")
          .select("task_id")
          .eq("completed_at", todayStr),
        supabase
          .from("finances")
          .select("amount, created_at")
          .gte("created_at", weekAgo)
          .order("created_at", { ascending: true }),
      ]);

      // 3. Batch Updates (Prevents multiple re-renders)
      if (attRes.data) setAttendance(attRes.data);
      if (balRes.data) setBalances(balRes.data);
      if (taskRes.data) setTasks(taskRes.data);
      if (logRes.data) setLogs(logRes.data.map((i: any) => i.task_id));
      if (finRes.data) setFinanceData(finRes.data);

      setLoading(false);
    };

    fetchAllData();
  }, []);

  const chartData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const total = financeData
        .filter(
          (item) => format(parseISO(item.created_at), "yyyy-MM-dd") === dayStr
        )
        .reduce((acc, curr) => acc + curr.amount, 0);

      return { date: format(day, "EEE"), amount: total };
    });
  }, [financeData]);

  const leaveStats = useMemo(() => {
    if (!balances) return { annual: 0, med: 0, cas: 0 };
    const currentYear = new Date().getFullYear();
    const used = { Annual: 0, Medical: 0, Casual: 0 };
    attendance
      .filter((r) => getYear(parseISO(r.date)) === currentYear)
      .forEach((r) => {
        if (r.status in used) used[r.status as keyof typeof used]++;
      });

    return {
      annual: balances.annual_total + (balances.annual_cf || 0) - used.Annual,
      med: balances.medical_total - used.Medical,
      cas: balances.casual_total - used.Casual,
    };
  }, [attendance, balances]);

  const routineProgress =
    tasks.length > 0 ? Math.round((logs.length / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Finance Graph Skeleton */}
        <div className="md:col-span-4 space-y-3">
          <Skeleton className="h-[300px] w-full rounded-3xl" />
        </div>

        {/* Attendance Skeleton */}
        <div className="md:col-span-2 space-y-3">
          <Skeleton className="h-[300px] w-full rounded-3xl" />
        </div>

        {/* Routine Skeleton */}
        <div className="md:col-span-6">
          <Skeleton className="h-[120px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in duration-500">
      {/* FINANCE GRAPH (Spans 4 columns OR 6 if Attendance is hidden) */}
      {visibleModules.finances && (
        <Link
          href="/dashboard/finances"
          className={cn(
            "group transition-all duration-500",
            visibleModules.attendance ? "md:col-span-4" : "md:col-span-6"
          )}
        >
          <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-500" /> Money Flow
                </CardTitle>
                <CardDescription>7-day spending trend</CardDescription>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
            </CardHeader>
            <CardContent className="h-[200px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAmt)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ATTENDANCE (Spans 2 columns OR 6 if Finance is hidden) */}
      {visibleModules.attendance && (
        <Link
          href="/dashboard/attendence"
          className={cn(
            "group transition-all duration-500",
            visibleModules.finances ? "md:col-span-2" : "md:col-span-6"
          )}
        >
          <Card className="h-full border-none shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
            <div className="h-1 bg-sky-500 w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-500" /> Time Off
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Annual Remaining
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">
                    {leaveStats.annual}
                  </span>
                  <span className="text-xs font-bold text-sky-600 uppercase">
                    Days
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors group-hover:bg-sky-50/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center">
                    Medical
                  </p>
                  <p className="text-lg font-black text-slate-700 text-center">
                    {leaveStats.med}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 transition-colors group-hover:bg-sky-50/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase text-center">
                    Casual
                  </p>
                  <p className="text-lg font-black text-slate-700 text-center">
                    {leaveStats.cas}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ROUTINE (Full Width if shown) */}
      {visibleModules.routine && (
        <Link href="/dashboard/routine" className="md:col-span-6 group">
          <Card className="border-none shadow-sm hover:shadow-md transition-all bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-slate-800"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * routineProgress) / 100}
                      className="text-pink-500 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-black">
                    {routineProgress}%
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl font-black">
                    Daily Routine
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {logs.length} of {tasks.length} habits completed today
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {tasks.slice(0, 5).map((task) => (
                  <Badge
                    key={task.id}
                    variant="outline"
                    className={cn(
                      "border-white/10 px-3 py-1 font-bold text-[10px] uppercase",
                      logs.includes(task.id)
                        ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                        : "bg-white/5 text-slate-400"
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        "w-3 h-3 mr-1.5",
                        logs.includes(task.id) ? "opacity-100" : "opacity-30"
                      )}
                    />
                    {task.title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
