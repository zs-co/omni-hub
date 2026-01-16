"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { Plus, Trash2, Loader2, StickyNote, Palette } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const COLORS = [
  { name: "Default", class: "bg-white border-slate-200" },
  { name: "yellow", class: "bg-yellow-50 border-yellow-200 text-yellow-900" },
  { name: "blue", class: "bg-blue-50 border-blue-200 text-blue-900" },
  { name: "green", class: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  { name: "rose", class: "bg-rose-50 border-rose-200 text-rose-900" },
];


const colorMap: Record<string, string> = {
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  yellow: "bg-yellow-400",
  purple: "bg-purple-400",
  // add more as needed
};
export default function QuickNotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [open, setOpen] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brain_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setNotes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("brain_notes").insert({
      content,
      color_tag: selectedColor.class,
      user_id: user?.id,
    });

    if (error) toast.error("Failed to save note");
    else {
      toast.success("Note added");
      setContent("");
      setSelectedColor(COLORS[0]);
      setOpen(false);
      fetchNotes();
    }
    setIsSubmitting(false);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("brain_notes").delete().eq("id", id);
    if (error) toast.error("Error deleting");
    else {
      setNotes(notes.filter((n) => n.id !== id));
      toast.success("Note removed");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="text-gray-600 w-6 h-6" /> Quick Notes
          </h1>
          <p className="text-sm text-slate-500 italic">
            Dump your thoughts, clear your mind.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800 shadow-lg shadow-gray-100">
              <Plus className="w-4 h-4 mr-2" /> New Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Quick Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Textarea
                placeholder="What's on your mind?..."
                className="min-h-[150px] resize-none border-slate-200 focus:ring-indigo-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Palette className="w-4 h-4 mr-2" /> {selectedColor.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {COLORS.map((c) => (
                      <DropdownMenuItem
                        key={c.name}
                        onClick={() => setSelectedColor(c)}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full mr-2 border",
                            c.class
                          )}
                        />
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={handleAddNote} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Save Note"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* NOTES GRID */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-300 w-10 h-10" />
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={cn(
                "break-inside-avoid shadow-sm transition-all hover:shadow-md",
                colorMap[note.color_tag] || "bg-gray-400"
              )}
              style={{background: `light${note.color_tag}`}}
            >
              <CardContent className="pt-6">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-0 pb-4">
                <span className="text-[10px] font-bold uppercase opacity-50">
                  {format(new Date(note.created_at), "MMM d, h:mm a")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-black/5 text-slate-400 hover:text-red-600"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {notes.length === 0 && !loading && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl text-slate-400">
          Your mind is clear. Add a note to get started.
        </div>
      )}
    </div>
  );
}
