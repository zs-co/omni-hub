"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search as SearchIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VaultPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vault")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("vault").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success(`${name} removed`);
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleAddItem = async (
    e: React.FormEvent<HTMLFormElement>,
    shouldClose: boolean
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const { error } = await supabase.from("vault").insert({
      name: formData.get("name"),
      location: formData.get("location"),
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    setIsSubmitting(false);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success(`${formData.get("name")} added`);
      fetchItems();
      form.reset();
      if (shouldClose) setOpen(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">The Vault</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add to Vault</DialogTitle>
            </DialogHeader>
            <form
              id="vault-form"
              className="space-y-4"
              onSubmit={(e) => handleAddItem(e, true)}
            >
              <div className="space-y-2">
                <Input
                  name="name"
                  placeholder="Item Name"
                  required
                  disabled={isSubmitting}
                />
                <Input
                  name="location"
                  placeholder="Location"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    const form = document.getElementById(
                      "vault-form"
                    ) as HTMLFormElement;
                    if (form.checkValidity())
                      handleAddItem(
                        {
                          preventDefault: () => {},
                          currentTarget: form,
                        } as any,
                        false
                      );
                    else form.reportValidity();
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    "Add & Another"
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    "Save & Close"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 h-12 rounded-xl"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.location}
                  </TableCell>
                  <TableCell>
                    {/* SHADCN ALERT DIALOG FOR DELETE */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove{" "}
                            <strong>{item.name}</strong> from your vault.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id, item.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/100"
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
      )}
    </div>
  );
}
