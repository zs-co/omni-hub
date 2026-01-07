"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase";
import { format, isWeekend, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  FileText,
  Loader2,
  List,
  LayoutGrid,
  Settings2,
  Pencil,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  // States for Editing/Adding
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isWorkedWeekend, setIsWorkedWeekend] = useState(false);
  const [customBalances, setCustomBalances] = useState({
    casual: 8,
    medical: 8,
    annual: 0,
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
    if (bal) {
      setCustomBalances({
        casual: bal.casual_total,
        medical: bal.medical_total,
        annual: bal.annual_total,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const used: Record<LeaveStatus, number> = {
      Medical: 0,
      Casual: 0,
      Annual: 0,
      Compensatory: 0,
    };
    let compEarned = 0;
    let compSpent = 0;

    records.forEach((r) => {
      const status = r.status as LeaveStatus;
      if (status === "Compensatory") {
        r.is_weekend_work ? compEarned++ : compSpent++;
      } else if (used[status] !== undefined) {
        used[status]++;
      }
    });

    const monthsPassed = new Date().getMonth() + 1;
    return {
      medical: { used: used.Medical, total: customBalances.medical },
      casual: { used: used.Casual, total: customBalances.casual },
      annual: {
        used: used.Annual,
        total: customBalances.annual || monthsPassed,
      },
      comp: { balance: compEarned - compSpent, earned: compEarned },
    };
  }, [records, customBalances]);

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

    let fileUrl = isEdit ? editingRecord.leave_form_url : "";
    const file = formData.get("leave_form") as File;
    if (file && file.size > 0) {
      setIsUploading(true);
      const fileName = `${user?.id}/${Date.now()}_${file.name}`;
      const { data: uploadData } = await supabase.storage
        .from("leave-forms")
        .upload(fileName, file);
      if (uploadData) fileUrl = uploadData.path;
    }

    const payload: any = {
      user_id: user?.id,
      date: isEdit ? editingRecord.date : format(selectedDate, "yyyy-MM-dd"),
      status: status,
      leave_form_url: fileUrl || null,
      is_weekend_work: status === "Compensatory" ? isWorkedWeekend : false,
    };

    if (isEdit) payload.id = editingRecord.id;

    const { error } = await supabase.from("attendance").upsert(payload);

    setIsUploading(false);
    if (error) toast.error("Error saving record");
    else {
      toast.success(isEdit ? "Record Updated" : "Record Added");
      setOpen(false);
      setEditOpen(false);
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
      updated_at: new Date(),
    });

    if (error) toast.error("Failed to update balances");
    else {
      toast.success("Balances Updated");
      setBalanceOpen(false);
      fetchData();
    }
  };

  const modifiers = useMemo(() => {
    const mods: Record<string, Date[]> = {};
    LEAVE_TYPES.forEach((t) => {
      mods[t.value] = records
        .filter((r) => r.status === t.value)
        .map((r) => parseISO(r.date));
    });
    return mods;
  }, [records]);

  const modifiersStyles = useMemo(() => {
    const styles: Record<string, any> = {};
    LEAVE_TYPES.forEach((t) => {
      styles[t.value] = { color: "white", backgroundColor: t.dot };
    });
    return styles;
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2 sm:px-0">
      {/* HEADER SECTION */}
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
            <form onSubmit={updateBalances} className="space-y-4 pt-4">
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
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Annual (Total)
                </label>
                <Input
                  name="annual"
                  type="number"
                  defaultValue={customBalances.annual}
                />
              </div>
              <Button type="submit" className="w-full bg-slate-900">
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEAVE_TYPES.map((type) => {
          const val = type.value;
          let count = 0;
          let subtext = "Left";

          if (val === "Compensatory") {
            count = stats.comp.balance;
            subtext = "Avail";
          } else if (val === "Medical")
            count = stats.medical.total - stats.medical.used;
          else if (val === "Casual")
            count = stats.casual.total - stats.casual.used;
          else if (val === "Annual")
            count = stats.annual.total - stats.annual.used;

          return (
            <Card
              key={type.value}
              className="border-none shadow-sm overflow-hidden bg-white"
            >
              <div className={cn("h-1", type.color)} />
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  {type.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">
                    {count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {subtext}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* TABS VIEW */}
      <Tabs defaultValue="list" className="w-full">
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-[200px]">
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" /> List
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <LayoutGrid className="w-4 h-4 mr-2" /> Calendar
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => {
              setIsWorkedWeekend(false);
              setOpen(true);
            }}
            className="w-full sm:w-auto bg-slate-900"
          >
            <Plus className="w-4 h-4 mr-2" /> Log Status
          </Button>
        </div>

        <TabsContent value="list" className="space-y-3 mt-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-slate-300" />
            </div>
          ) : (
            records.map((record) => {
              const typeInfo = LEAVE_TYPES.find(
                (t) => t.value === record.status
              );
              const isEarned =
                record.status === "Compensatory" && record.is_weekend_work;
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
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {format(parseISO(record.date), "EEEE")}
                        </p>
                        {isEarned && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[8px] h-4 border-none font-black tracking-widest px-1.5">
                            EARNED
                          </Badge>
                        )}
                        {record.status === "Compensatory" &&
                          !record.is_weekend_work && (
                            <Badge className="bg-slate-100 text-slate-500 text-[8px] h-4 border-none font-black tracking-widest px-1.5">
                              TAKEN
                            </Badge>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-black uppercase border-none px-2 h-5 hidden sm:flex",
                        typeInfo?.light
                      )}
                    >
                      {record.status}
                    </Badge>
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
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <Card className="border-none shadow-sm bg-white overflow-hidden p-4 flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border-none"
            />
            <div className="flex flex-wrap gap-4 mt-6 justify-center">
              {LEAVE_TYPES.map((t) => (
                <div key={t.label} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", t.color)} />{" "}
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD/EDIT DIALOG */}
      <Dialog
        open={open || editOpen}
        onOpenChange={(v) => {
          setOpen(v);
          setEditOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editOpen ? "Edit Record" : "Log Attendance"}
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
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Leave Type
                </label>
                <Select
                  name="status"
                  defaultValue={
                    editOpen
                      ? editingRecord?.status
                      : isWeekend(selectedDate)
                      ? "Compensatory"
                      : "Casual"
                  }
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

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900">
                    Did you work this day?
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Toggle ON to earn a Compensatory Leave
                  </p>
                </div>
                <Switch
                  checked={isWorkedWeekend}
                  onCheckedChange={setIsWorkedWeekend}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Leave Form (Image)
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
              className="w-full h-12 bg-slate-900 rounded-xl font-bold"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : editOpen ? (
                "Update Record"
              ) : (
                "Save Record"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
