"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import { CheckCircle2, Circle, Plus, Trash2, Zap, Sun, Moon, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RoutinePage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch all tasks defined by user
    const { data: t } = await supabase.from("routine_tasks").select("*");
    
    // Fetch only today's completions
    const today = new Date().toISOString().split('T')[0];
    const { data: l } = await supabase.from("routine_logs").select("task_id").eq("completed_at", today);

    if (t) setTasks(t);
    if (l) setLogs(l.map(item => item.task_id));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((logs.length / tasks.length) * 100);
  }, [tasks, logs]);

  const toggleTask = async (taskId: string) => {
    const isCompleted = logs.includes(taskId);
    const today = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();

    if (isCompleted) {
      await supabase.from("routine_logs").delete().eq("task_id", taskId).eq("completed_at", today);
      setLogs(logs.filter(id => id !== taskId));
    } else {
      await supabase.from("routine_logs").insert({ task_id: taskId, user_id: user?.id });
      setLogs([...logs, taskId]);
      toast.success("Task completed!");
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("routine_tasks").insert({ title: newTask, user_id: user?.id });
    if (!error) {
      setNewTask("");
      fetchData();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      {/* PROGRESS HEADER */}
      <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
        <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12" />
        <CardContent className="p-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-2xl font-black">Daily Routine</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black">{progress}%</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Done</p>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
        </CardContent>
      </Card>

      {/* QUICK ADD */}
      <form onSubmit={addTask} className="flex gap-2">
        <Input 
          placeholder="Add a daily habit..." 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          className="rounded-xl border-slate-200 h-12"
        />
        <Button type="submit" className="bg-slate-900 h-12 w-12 rounded-xl">
          <Plus className="w-5 h-5" />
        </Button>
      </form>

      {/* TASK LIST */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isDone = logs.includes(task.id);
          return (
            <div 
              key={task.id} 
              onClick={() => toggleTask(task.id)}
              className={cn(
                "group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                isDone ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200 hover:border-slate-400"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                )}>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <span className={cn(
                  "font-bold text-sm transition-all",
                  isDone ? "text-slate-400 line-through" : "text-slate-700"
                )}>
                  {task.title}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                onClick={async (e) => {
                  e.stopPropagation();
                  await supabase.from("routine_tasks").delete().eq("id", task.id);
                  fetchData();
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}