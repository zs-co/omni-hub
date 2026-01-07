"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import {
  Plus,
  Trash2,
  Loader2,
  Code2,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { toast } from "sonner";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function SnippetsPage() {
  const supabase = createClient();
  const [snippets, setSnippets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchSnippets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("brain_snippets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSnippets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const handleAddSnippet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("brain_snippets").insert({
      title: formData.get("title"),
      code_content: formData.get("code_content"),
      language: formData.get("language") || "text",
      user_id: user?.id,
    });

    if (error) toast.error("Failed to save snippet");
    else {
      toast.success("Snippet saved");
      setOpen(false);
      fetchSnippets();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteSnippet = async (id: string) => {
    const { error } = await supabase
      .from("brain_snippets")
      .delete()
      .eq("id", id);
    if (!error) {
      setSnippets(snippets.filter((s) => s.id !== id));
      toast.success("Deleted");
    }
  };

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code_content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Code2 className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Snippets
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Cloud Clipboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search snippets..."
              className="pl-9 h-10 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 h-10 px-4 shrink-0">
                <Plus className="w-4 h-4 mr-2" /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Snippet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSnippet} className="space-y-4 pt-4">
                <Input
                  name="title"
                  placeholder="Title (e.g. Meezan Bank IBAN)"
                  required
                />
                <Input
                  name="language"
                  placeholder="Type (e.g. Text, SQL, React)"
                />
                <Textarea
                  name="code_content"
                  placeholder="Paste content here..."
                  className="min-h-[200px] font-mono text-sm bg-slate-50"
                  required
                />
                <Button type="submit" className="w-full bg-slate-900">
                  Save Snippet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-300" />
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <Card
              key={snippet.id}
              className="group border-slate-200 hover:border-slate-400 transition-all shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-slate-900">
                      {snippet.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-tight h-5"
                    >
                      {snippet.language}
                    </Badge>
                  </div>
                  <pre className="p-4 bg-slate-50 rounded-lg text-sm font-mono text-slate-700 overflow-x-auto border border-slate-100 whitespace-pre-wrap break-all">
                    {snippet.code_content}
                  </pre>
                </div>

                <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-slate-100 bg-slate-50/50">
                  <Button
                    variant="ghost"
                    className="flex-1 sm:h-1/2 rounded-none hover:bg-slate-100 transition-colors"
                    onClick={() =>
                      copyToClipboard(snippet.code_content, snippet.id)
                    }
                  >
                    {copiedId === snippet.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 sm:h-1/2 rounded-none hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    onClick={() => deleteSnippet(snippet.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {filteredSnippets.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          No snippets found matching your search.
        </div>
      )}
    </div>
  );
}
