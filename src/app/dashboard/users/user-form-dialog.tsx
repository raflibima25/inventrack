"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateFormData,
  type UserUpdateFormData,
} from "@/lib/validations/user";
import { createUser, updateUser } from "@/actions/users";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: { id: string; username: string; name: string; role: string } | null;
  onSuccess: () => void;
};

export function UserFormDialog({ open, onOpenChange, editData, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, update: updateSession } = useSession();
  const isEdit = !!editData;
  const isSelf = editData?.id === session?.user?.id;

  const form = useForm<UserCreateFormData | UserUpdateFormData>({
    resolver: zodResolver(isEdit ? userUpdateSchema : userCreateSchema),
    defaultValues: editData
      ? { username: editData.username, name: editData.name, role: editData.role as "ADMIN" | "VIEWER", password: "" }
      : { username: "", password: "", name: "", role: "VIEWER" as const },
  });

  // Reset form when editData changes
  if (open) {
    const currentUsername = form.getValues("username");
    const expectedUsername = editData?.username ?? "";
    if (currentUsername !== expectedUsername) {
      form.reset(
        editData
          ? { username: editData.username, name: editData.name, role: editData.role as "ADMIN" | "VIEWER", password: "" }
          : { username: "", password: "", name: "", role: "VIEWER" as const }
      );
    }
  }

  async function onSubmit(data: UserCreateFormData | UserUpdateFormData) {
    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateUser(editData!.id, data as UserUpdateFormData)
        : await createUser(data as UserCreateFormData);

      if (result.success) {
        toast.success(isEdit ? "Pengguna berhasil diperbarui" : "Pengguna berhasil ditambahkan");
        // Refresh session token jika user mengedit datanya sendiri
        if (isEdit && isSelf) {
          await updateSession();
        }
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEdit ? "(kosongkan jika tidak diubah)" : "*"}
            </Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap *</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", (v ?? "VIEWER") as "ADMIN" | "VIEWER")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
