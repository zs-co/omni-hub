"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import { format, subDays, isAfter } from "date-fns";
import {
  Plus,
  Loader2,
  TrendingDown,
  CircleDollarSign,
  CalendarDays,
  Trash2,
  CalendarIcon,
  Edit3,
  LineChart,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenditureChart } from "@/components/ExpenditureChart";
import { cn } from "@/lib/utils";

export default function FinancesPage() {
  const supabase = createClient();
  const [data, setData] = useState<any[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [timeframe, setTimeframe] = useState("30");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  // Toggles for Chart
  const [chartView, setChartView] = useState<"daily" | "cumulative">("daily");
  const [chartType, setChartType] = useState<"date" | "category">("date");

  // Form State
  const [date, setDate] = useState<Date>(new Date());
  const [categories, setCategories] = useState([
    "Food",
    "Transport",
    "Bills",
    "Shopping",
    "Entertainment",
  ]);
  const [newCat, setNewCat] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: records } = await supabase
      .from("finances")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: settings } = await supabase
      .from("user_settings")
      .select("monthly_budget")
      .eq("user_id", user?.id)
      .single();

    if (records) setData(records);
    if (settings) setMonthlyBudget(settings.monthly_budget);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(timeframe));
    return data.filter((item) =>
      isAfter(new Date(item.created_at), cutoffDate)
    );
  }, [data, timeframe]);

  const saveBudget = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const newBudget = Number(budgetInput);
    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user?.id,
        monthly_budget: newBudget,
        updated_at: new Date(),
      });

    if (error) toast.error("Failed to save budget");
    else {
      setMonthlyBudget(newBudget);
      toast.success("Budget updated");
    }
  };

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const category = showNewCatInput ? newCat : formData.get("category");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("finances").insert({
      label: formData.get("label"),
      amount: parseFloat(formData.get("amount") as string),
      category,
      is_subscription: formData.get("is_subscription") === "on",
      created_at: date.toISOString(),
      user_id: user?.id,
    });

    setIsSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Logged successfully");
      if (showNewCatInput && !categories.includes(newCat))
        setCategories([...categories, newCat]);
      fetchData();
      setOpen(false);
      setDate(new Date());
      setShowNewCatInput(false);
      setNewCat("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("finances").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Entry removed");
      setData(data.filter((i) => i.id !== id));
    }
  };

  const totalSpent = useMemo(
    () => data.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [data]
  );
  const subscriptions = useMemo(
    () => data.filter((item) => item.is_subscription),
    [data]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 shadow-lg shadow-slate-200">
              <Plus className="w-4 h-4 mr-2" /> Log Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddEntry} className="space-y-4 pt-4">
              <Input name="label" placeholder="Description" required />
              <Input
                name="amount"
                type="number"
                step="0.01"
                placeholder="PKR Amount"
                required
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />{" "}
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                {!showNewCatInput ? (
                  <Select name="category" required>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="New category name..."
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                >
                  {showNewCatInput ? (
                    <LineChart className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-2 border p-3 rounded-lg">
                <Checkbox id="is_subscription" name="is_subscription" />
                <label
                  htmlFor="is_subscription"
                  className="text-sm font-medium"
                >
                  Monthly subscription
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Save Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* CHART AREA WITH TOGGLES */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <Tabs
                  value={chartType}
                  onValueChange={(v: any) => setChartType(v)}
                >
                  <TabsList className="h-8">
                    <TabsTrigger
                      value="date"
                      className="text-[10px] uppercase font-bold"
                    >
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger
                      value="category"
                      className="text-[10px] uppercase font-bold"
                    >
                      Category
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {chartType === "date" && (
                  <Tabs
                    value={chartView}
                    onValueChange={(v: any) => setChartView(v)}
                  >
                    <TabsList className="h-8">
                      <TabsTrigger
                        value="daily"
                        className="text-[10px] uppercase font-bold"
                      >
                        Wavy
                      </TabsTrigger>
                      <TabsTrigger
                        value="cumulative"
                        className="text-[10px] uppercase font-bold"
                      >
                        Total
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[130px] h-8 text-xs font-bold">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Last 15 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="180">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-[280px] w-full">
              <ExpenditureChart
                data={filteredData}
                view={chartView}
                type={chartType}
              />
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b font-bold text-slate-800">
              Recent Activity
            </div>
            <Table>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <p className="font-semibold text-slate-900 leading-none mb-1">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {format(new Date(item.created_at), "dd MMM yyyy")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal uppercase"
                      >
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      Rs. {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="w-10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-300 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogDescription>
                            This will permanently remove this transaction from
                            your records.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* REMAINING BUDGET CARD */}
          <div
            className={cn(
              "p-6 rounded-2xl border shadow-sm relative overflow-hidden",
              monthlyBudget - totalSpent < 0
                ? "bg-white-50 border-gray-200"
                : "bg-white border-slate-200"
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Remaining Budget
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[300px]">
                  <DialogHeader>
                    <DialogTitle>Edit Budget</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      type="number"
                      placeholder={monthlyBudget.toString()}
                      onChange={(e) => setBudgetInput(e.target.value)}
                    />
                    <Button className="w-full" onClick={saveBudget}>
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <p
              className={cn(
                "text-3xl font-black",
                monthlyBudget - totalSpent < 0
                  ? "text-red-600"
                  : "text-emerald-600"
              )}
            >
              Rs. {(monthlyBudget - totalSpent).toLocaleString()}
            </p>
            <div className="mt-4 pt-4 border-t flex justify-between items-center text-[11px] font-bold uppercase text-slate-400">
              <span>Spent: Rs. {totalSpent.toLocaleString()}</span>
              <span>Goal: Rs. {monthlyBudget.toLocaleString()}</span>
            </div>
          </div>

          {/* ACTIVE SUBSCRIPTIONS */}
          <div className="bg-white-50 text-slate-400 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" /> Active
              Subscriptions
            </h3>
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex justify-between items-center group"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-600">
                      {sub.label}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {sub.category}
                    </p>
                  </div>
                  <span className="text-sm font-black text-gray-400">
                    Rs. {sub.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <p className="text-xs text-slate-600 italic">
                  No subscriptions found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
