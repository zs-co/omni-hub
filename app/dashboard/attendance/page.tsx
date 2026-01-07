"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import {
  format,
  isWeekend,
  parseISO,
  getYear,
  eachDayOfInterval,
} from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Trash2,
  Plus,
  Loader2,
  List,
  LayoutGrid,
  Settings2,
  Pencil,
  Download,
  Filter,
  X,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type LeaveStatus = "Medical" | "Casual" | "Annual" | "Compensatory";

const LEAVE_TYPES: {
  label: string;
  value: LeaveStatus;
  color: string;
  light: string;
  dot: string;
}[] = [
  {
    label: "Medical",
    value: "Medical",
    color: "bg-rose-500",
    light: "bg-rose-50 text-rose-700",
    dot: "#f43f5e",
  },
  {
    label: "Casual",
    value: "Casual",
    color: "bg-amber-500",
    light: "bg-amber-50 text-amber-700",
    dot: "#f59e0b",
  },
  {
    label: "Annual",
    value: "Annual",
    color: "bg-sky-500",
    light: "bg-sky-50 text-sky-700",
    dot: "#0ea5e9",
  },
  {
    label: "Compensatory",
    value: "Compensatory",
    color: "bg-emerald-500",
    light: "bg-emerald-50 text-emerald-700",
    dot: "#10b981",
  },
];

export default function AttendancePage() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [filterYear, setFilterYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [filterType, setFilterType] = useState<string>("all");

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isWorkedWeekend, setIsWorkedWeekend] = useState(false);
  const [customBalances, setCustomBalances] = useState({
    casual: 8,
    medical: 8,
    annual: 12,
    annual_cf: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [attRes, balRes] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("leave_balances")
        .select("*")
        .eq("user_id", user?.id)
        .single(),
    ]);
    if (attRes.data) setRecords(attRes.data);
    if (balRes.data)
      setCustomBalances({
        casual: balRes.data.casual_total,
        medical: balRes.data.medical_total,
        annual: balRes.data.annual_total,
        annual_cf: balRes.data.annual_cf || 0,
      });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const currentYear = parseInt(filterYear);
    const today = new Date();
    let accrued =
      currentYear === today.getFullYear()
        ? today.getMonth() + 1
        : currentYear > today.getFullYear()
        ? 0
        : 12;
    const yearRecords = records.filter(
      (r) => getYear(parseISO(r.date)) === currentYear
    );
    const used: Record<LeaveStatus, number> = {
      Medical: 0,
      Casual: 0,
      Annual: 0,
      Compensatory: 0,
    };

    let totalCompEarned = 0;
    let totalCompSpent = 0;

    records.forEach((r) => {
      if (r.status === "Compensatory") {
        r.is_weekend_work ? totalCompEarned++ : totalCompSpent++;
      }
      if (
        getYear(parseISO(r.date)) === currentYear &&
        r.status !== "Compensatory"
      ) {
        used[r.status as LeaveStatus]++;
      }
    });

    return {
      medical: customBalances.medical - used.Medical,
      casual: customBalances.casual - used.Casual,
      annual: {
        total: accrued + customBalances.annual_cf,
        accrued,
        cf: customBalances.annual_cf,
        remaining: accrued + customBalances.annual_cf - used.Annual,
      },
      comp: { balance: totalCompEarned - totalCompSpent },
    };
  }, [records, customBalances, filterYear]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesYear = getYear(parseISO(r.date)).toString() === filterYear;
      const matchesType = filterType === "all" || r.status === filterType;
      return matchesYear && matchesType;
    });
  }, [records, filterYear, filterType]);

  const handleUpsertRecord = async (
    e: React.FormEvent<HTMLFormElement>,
    isEdit = false
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const status = formData.get("status") as LeaveStatus;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploading(true);
    let fileUrl = isEdit ? editingRecord.leave_form_url : "";
    const file = formData.get("leave_form") as File;

    // FIXED: Ensure unique filenames and correct bucket path
    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}_form.${fileExt}`;
      const { data: uploadData, error: upErr } = await supabase.storage
        .from("leave-forms")
        .upload(fileName, file);
      if (upErr) {
        toast.error("Upload failed");
        setIsUploading(false);
        return;
      }
      fileUrl = uploadData.path;
    }

    // FIXED: Range logic calculation
    let datesToLog = isEdit
      ? [editingRecord.date]
      : dateRange?.from && dateRange?.to
      ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(
          (d) => format(d, "yyyy-MM-dd")
        )
      : dateRange?.from
      ? [format(dateRange.from, "yyyy-MM-dd")]
      : [];

    const payloads = datesToLog.map((date) => ({
      ...(isEdit ? { id: editingRecord.id } : {}),
      user_id: user.id,
      date,
      status,
      leave_form_url: fileUrl || null,
      is_weekend_work: status === "Compensatory" ? isWorkedWeekend : false,
    }));

    const { error } = await supabase.from("attendance").upsert(payloads);

    if (!error) {
      toast.success(isEdit ? "Updated" : `Logged ${payloads.length} days`);
      // FIXED: Explicitly clear states to stop flicker and old date retention
      setOpen(false);
      setEditOpen(false);
      setEditingRecord(null);
      setDateRange(undefined);
      setIsWorkedWeekend(false);
      fetchData();
    }
    setIsUploading(false);
  };

  const getImageUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/leave-forms/${path}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 sm:px-0">
      {/* RESTORED HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Attendance
          </h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
            Mon - Fri • 09:00 - 18:00
          </p>
        </div>
        <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-slate-200"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle>Edit Yearly Quota</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                await supabase.from("leave_balances").upsert({
                  user_id: user?.id,
                  casual_total: Number(fd.get("casual")),
                  medical_total: Number(fd.get("medical")),
                  annual_total: Number(fd.get("annual")),
                  annual_cf: Number(fd.get("annual_cf")),
                });
                toast.success("Saved");
                setBalanceOpen(false);
                fetchData();
              }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="casual"
                  type="number"
                  defaultValue={customBalances.casual}
                  placeholder="Casual"
                />
                <Input
                  name="medical"
                  type="number"
                  defaultValue={customBalances.medical}
                  placeholder="Medical"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="annual"
                  type="number"
                  defaultValue={customBalances.annual}
                  placeholder="Annual"
                />
                <Input
                  name="annual_cf"
                  type="number"
                  defaultValue={customBalances.annual_cf}
                  placeholder="CF"
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900">
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-rose-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Medical
            </p>
            <span className="text-xl font-black">{stats.medical} Left</span>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Casual
            </p>
            <span className="text-xl font-black">{stats.casual} Left</span>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-sky-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Annual
            </p>
            <span className="text-xl font-black">{stats.annual.remaining}</span>{" "}
            <span className="text-[8px] font-bold text-sky-600 uppercase">
              ({stats.annual.accrued}+{stats.annual.cf} CF)
            </span>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Compensatory
            </p>
            <span className="text-xl font-black">{stats.comp.balance}</span>
          </CardContent>
        </Card>
      </div>

      {/* FULLY RESTORED FILTER & ACTIONS SECTION */}
      <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border px-3">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* RESTORED TYPE FILTERS */}
        <div className="hidden sm:flex gap-2">
          {["all", ...LEAVE_TYPES.map((t) => t.value)].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-all",
                filterType === type
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <Button
          onClick={() => {
            setEditingRecord(null);
            setOpen(true);
          }}
          className="ml-auto bg-slate-900 h-9 rounded-xl px-4"
        >
          <Plus className="w-4 h-4 mr-2" /> Log Status
        </Button>
      </div>

      {/* LIST VIEW */}
      <div className="space-y-3">
        {filteredRecords.map((record) => {
          const typeInfo = LEAVE_TYPES.find((t) => t.value === record.status);
          const hasForm = !!record.leave_form_url;
          return (
            <div
              key={record.id}
              className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs",
                    typeInfo?.light
                  )}
                >
                  {format(parseISO(record.date), "dd")}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">
                    {format(parseISO(record.date), "MMMM yyyy")}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {format(parseISO(record.date), "EEEE")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasForm}
                  className={cn(
                    "h-8 w-8 rounded-lg",
                    hasForm
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-200 bg-slate-50"
                  )}
                  onClick={() =>
                    hasForm &&
                    setPreviewImage(getImageUrl(record.leave_form_url))
                  }
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400"
                  onClick={() => {
                    setEditingRecord(record);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                  onClick={async () => {
                    if (confirm("Delete?")) {
                      await supabase
                        .from("attendance")
                        .delete()
                        .eq("id", record.id);
                      fetchData();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white flex items-center gap-2 font-bold uppercase text-xs"
            >
              <X /> Close
            </button>
            <img
              src={previewImage}
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white"
            />
            <div className="mt-4 flex justify-center">
              <Button
                onClick={() => window.open(previewImage)}
                className="bg-white text-black rounded-full px-8 font-black uppercase text-xs tracking-widest"
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 1. LOG NEW ATTENDANCE (With Calendar & Date Reset) */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setDateRange(undefined); // RESETS DATE RANGE ON CLOSE
            setIsWorkedWeekend(false); // RESETS OT TOGGLE ON CLOSE
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Log Attendance</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => handleUpsertRecord(e, false)}
            className="space-y-6 pt-4"
          >
            <div className="flex flex-col items-center gap-2">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                className="rounded-md border mx-auto"
              />
              <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                Select Start and End Date
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Leave Type
                </label>
                <Select name="status" defaultValue="Casual">
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                <p className="text-sm font-bold">Worked this day?</p>
                <Switch
                  checked={isWorkedWeekend}
                  onCheckedChange={setIsWorkedWeekend}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Upload Form
                </label>
                <Input
                  type="file"
                  name="leave_form"
                  accept="image/*"
                  className="border-slate-200"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-slate-900 rounded-xl font-bold h-12"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. EDIT EXISTING RECORD (Instant & Clean) */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) {
            setEditingRecord(null); // CLEARS SELECTED RECORD ON CLOSE
            setIsWorkedWeekend(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Record: {editingRecord?.date}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => handleUpsertRecord(e, true)}
            className="space-y-6 pt-4"
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Leave Type
                </label>
                <Select name="status" defaultValue={editingRecord?.status}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                <p className="text-sm font-bold">Worked this day?</p>
                <Switch
                  checked={isWorkedWeekend}
                  onCheckedChange={setIsWorkedWeekend}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Upload Form
                </label>
                <Input
                  type="file"
                  name="leave_form"
                  accept="image/*"
                  className="border-slate-200"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-slate-900 rounded-xl font-bold h-12"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Update Record"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
