"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import { format, isWeekend, parseISO, getYear } from "date-fns";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    const { data: att } = await supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false });
    if (att) setRecords(att);

    const { data: bal } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    if (bal)
      setCustomBalances({
        casual: bal.casual_total,
        medical: bal.medical_total,
        annual: bal.annual_total,
        annual_cf: bal.annual_cf || 0, // Fetching the manual CF
      });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats Logic: Annual Carry Forward & Yearly Filters
  const stats = useMemo(() => {
    const currentYear = parseInt(filterYear);
    const today = new Date();

    // 1. Annual Accrual (1 per month)
    let accrued = 12;
    if (currentYear === today.getFullYear()) {
      accrued = today.getMonth() + 1;
    } else if (currentYear > today.getFullYear()) {
      accrued = 0;
    }

    // 2. Filter records for the selected year (for Casual/Medical/Annual usage)
    const yearRecords = records.filter(
      (r) => getYear(parseISO(r.date)) === currentYear
    );

    const used: Record<LeaveStatus, number> = {
      Medical: 0,
      Casual: 0,
      Annual: 0,
      Compensatory: 0,
    };

    // 3. Compensatory Logic (LIFETIME BALANCE)
    // We calculate this from ALL records so they carry forward automatically
    let totalCompEarned = 0;
    let totalCompSpent = 0;

    records.forEach((r) => {
      if (r.status === "Compensatory") {
        r.is_weekend_work ? totalCompEarned++ : totalCompSpent++;
      }
    });

    // 4. Calculate usage for the specific filtered year
    yearRecords.forEach((r) => {
      const status = r.status as LeaveStatus;
      if (status !== "Compensatory" && used[status] !== undefined) {
        used[status]++;
      }
    });

    const totalAnnualAvailable = accrued + customBalances.annual_cf;

    return {
      medical: customBalances.medical - used.Medical,
      casual: customBalances.casual - used.Casual,
      annual: {
        total: totalAnnualAvailable,
        accrued: accrued,
        cf: customBalances.annual_cf,
        remaining: totalAnnualAvailable - used.Annual,
      },
      comp: {
        balance: totalCompEarned - totalCompSpent,
        totalEarned: totalCompEarned,
      },
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
    const dateStr = isEdit
      ? editingRecord.date
      : format(selectedDate, "yyyy-MM-dd");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let fileUrl = isEdit ? editingRecord.leave_form_url : "";
    const file = formData.get("leave_form") as File;

    if (file && file.size > 0) {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${dateStr}_leave_form.${fileExt}`;
      const { data: uploadData } = await supabase.storage
        .from("leave-forms")
        .upload(fileName, file, { upsert: true });
      if (uploadData) fileUrl = uploadData.path;
    }

    const payload: any = {
      user_id: user?.id,
      date: dateStr,
      status: status,
      leave_form_url: fileUrl || null,
      is_weekend_work: status === "Compensatory" ? isWorkedWeekend : false,
    };
    if (isEdit) payload.id = editingRecord.id;

    const { error } = await supabase.from("attendance").upsert(payload);
    setIsUploading(false);
    if (!error) {
      toast.success(isEdit ? "Record Updated" : "Record Added");
      setOpen(false);
      setEditOpen(false);
      setEditingRecord(null);
      fetchData();
    }
  };

  const updateBalances = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("leave_balances").upsert({
      user_id: user?.id,
      casual_total: Number(formData.get("casual")),
      medical_total: Number(formData.get("medical")),
      annual_total: Number(formData.get("annual")),
    });

    if (error) toast.error("Failed to update balances");
    else {
      toast.success("Quota Updated");
      setBalanceOpen(false);
      fetchData();
    }
  };

  const getImageUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/leave-forms/${path}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 sm:px-0">
      {/* RESTORED HEADER WITH SETTINGS */}
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
                const formData = new FormData(e.currentTarget);
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                const { error } = await supabase.from("leave_balances").upsert({
                  user_id: user?.id,
                  casual_total: Number(formData.get("casual")),
                  medical_total: Number(formData.get("medical")),
                  annual_total: Number(formData.get("annual")),
                  annual_cf: Number(formData.get("annual_cf")), // Saving manual CF
                });

                if (!error) {
                  toast.success("Quota & CF Updated");
                  setBalanceOpen(false);
                  fetchData();
                }
              }}
              className="space-y-4 pt-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Casual Total
                  </label>
                  <Input
                    name="casual"
                    type="number"
                    defaultValue={customBalances.casual}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Medical Total
                  </label>
                  <Input
                    name="medical"
                    type="number"
                    defaultValue={customBalances.medical}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Annual Quota
                  </label>
                  <Input
                    name="annual"
                    type="number"
                    defaultValue={customBalances.annual}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Carry Forward (CF)
                  </label>
                  <Input
                    name="annual_cf"
                    type="number"
                    max="8"
                    defaultValue={customBalances.annual_cf}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic leading-tight">
                * CF is usually capped at 8 days per company policy.
              </p>
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
            <p className="text-[10px] font-bold uppercase text-slate-400">
              Medical
            </p>
            <span className="text-xl font-black text-slate-900">
              {stats.medical}
            </span>{" "}
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Left
            </span>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400">
              Casual
            </p>
            <span className="text-xl font-black text-slate-900">
              {stats.casual}
            </span>{" "}
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Left
            </span>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-sky-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400">
              Annual
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {stats.annual.remaining}
              </span>
              <span className="text-[10px] text-sky-600 font-bold uppercase">
                ({stats.annual.accrued} + {stats.annual.cf} CF)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <div className="h-1 bg-emerald-500" />
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400">
              Compensatory
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900">
                {stats.comp.balance}
              </span>
              <Badge
                variant="outline"
                className="text-[8px] h-4 border-emerald-100 text-emerald-600 font-bold px-1"
              >
                CARRY OVER
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & ACTIONS */}
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
            setIsWorkedWeekend(false);
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
          return (
            <div
              key={record.id}
              className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                {record.leave_form_url ? (
                  <div
                    className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden cursor-pointer hover:ring-2 ring-slate-900 transition-all border"
                    onClick={() =>
                      setPreviewImage(getImageUrl(record.leave_form_url))
                    }
                  >
                    <img
                      src={getImageUrl(record.leave_form_url)}
                      className="w-full h-full object-cover"
                      alt="form"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs",
                      typeInfo?.light
                    )}
                  >
                    {format(parseISO(record.date), "dd")}
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">
                    {format(parseISO(record.date), "MMMM yyyy")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {format(parseISO(record.date), "EEEE")}
                    </p>
                    {record.status === "Compensatory" &&
                      record.is_weekend_work && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[8px] h-4 border-none font-black px-1.5 uppercase">
                          Earned
                        </Badge>
                      )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-900"
                  onClick={() => {
                    setEditingRecord(record);
                    setIsWorkedWeekend(record.is_weekend_work);
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
                    await supabase
                      .from("attendance")
                      .delete()
                      .eq("id", record.id);
                    fetchData();
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* IMAGE PREVIEW MODAL */}
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
              <X className="w-5 h-5" /> Close
            </button>
            <img
              src={previewImage}
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white"
              alt="Preview"
            />
            <div className="mt-4 flex justify-center">
              <Button
                onClick={() => window.open(previewImage)}
                className="bg-white text-black hover:bg-slate-100 rounded-full px-8 font-black uppercase text-xs tracking-widest"
              >
                <Download className="w-4 h-4 mr-2" /> Download Full Quality
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT DIALOG */}
      <Dialog
        open={open || editOpen}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setEditOpen(false);
            setEditingRecord(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editOpen
                ? `Editing Record: ${editingRecord?.date}`
                : "Log Attendance"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => handleUpsertRecord(e, editOpen)}
            className="space-y-6 pt-4"
          >
            {!editOpen && (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="rounded-md border mx-auto"
              />
            )}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Leave Type
                </label>
                <Select
                  name="status"
                  defaultValue={editOpen ? editingRecord?.status : "Casual"}
                >
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
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Worked this day?</p>
                  <p className="text-[10px] text-slate-500">
                    Toggle for C-Leave credit
                  </p>
                </div>
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
    </div>
  );
}
