"use client";
import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister, type UseFormSetValue, } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Users, RefreshCw, CheckCircle2, AlertCircle, Loader2, Pencil, Trash2, Search, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAuthStore } from "@/store/auth-store";
import { apiFetchStaff, apiRegisterCashier, apiUpdateCashier, apiDeleteCashier, type StaffMember, } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/ui/skeleton";
const cashierFormSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    username: z
        .string()
        .min(3, "Min 3 characters")
        .transform((v) => v.toLowerCase().trim())
        .refine((v) => /^[a-z0-9_]+$/.test(v), {
        message: "Lowercase letters, numbers, underscore only",
    }),
    password: z.string().min(6, "Min 6 characters"),
});
const editFormSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    username: z
        .string()
        .min(3)
        .transform((v) => v.toLowerCase().trim())
        .refine((v) => /^[a-z0-9_]+$/.test(v), {
        message: "Lowercase only",
    }),
    password: z.string().optional(),
});
type CashierForm = z.infer<typeof cashierFormSchema>;
type EditForm = z.infer<typeof editFormSchema>;
type StaffFormFields = {
    fullName: string;
    username: string;
    password?: string;
};
function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
function sanitizeUsername(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}
export function StaffManagementPage() {
    const token = useAuthStore((s) => s.token);
    const [cashiers, setCashiers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const addForm = useForm<CashierForm>({
        resolver: zodResolver(cashierFormSchema),
    });
    const editForm = useForm<EditForm>({
        resolver: zodResolver(editFormSchema),
    });
    const loadStaff = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        setListError(null);
        try {
            const data = await apiFetchStaff(token);
            setCashiers(data.cashiers);
        }
        catch (err) {
            setListError(err instanceof Error ? err.message : "Failed to load staff");
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);
    useEffect(() => {
        loadStaff();
    }, [loadStaff]);
    useEffect(() => {
        if (editTarget) {
            editForm.reset({
                fullName: editTarget.fullName,
                username: editTarget.username,
                password: "",
            });
            setFormError(null);
            setFormSuccess(null);
        }
    }, [editTarget, editForm]);
    const openAdd = () => {
        setFormError(null);
        setFormSuccess(null);
        addForm.reset();
        setAddOpen(true);
    };
    const onAddSubmit = async (data: CashierForm) => {
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);
        try {
            const res = await apiRegisterCashier(token, data);
            setFormSuccess(res.message);
            addForm.reset();
            await loadStaff(true);
            setTimeout(() => {
                setAddOpen(false);
                setFormSuccess(null);
            }, 1200);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : "Registration failed");
        }
        finally {
            setSubmitting(false);
        }
    };
    const onEditSubmit = async (data: EditForm) => {
        if (!editTarget)
            return;
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);
        try {
            const body: {
                fullName: string;
                username: string;
                password?: string;
            } = {
                fullName: data.fullName,
                username: data.username,
            };
            if (data.password && data.password.length >= 6) {
                body.password = data.password;
            }
            const res = await apiUpdateCashier(token, editTarget.id, body);
            setFormSuccess(res.message);
            await loadStaff(true);
            setTimeout(() => {
                setEditTarget(null);
                setFormSuccess(null);
            }, 1200);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : "Update failed");
        }
        finally {
            setSubmitting(false);
        }
    };
    const onDeleteConfirm = async () => {
        if (!deleteTarget)
            return;
        setDeleting(true);
        try {
            await apiDeleteCashier(token, deleteTarget.id);
            setDeleteTarget(null);
            await loadStaff(true);
        }
        catch (err) {
            setListError(err instanceof Error ? err.message : "Delete failed");
            setDeleteTarget(null);
        }
        finally {
            setDeleting(false);
        }
    };
    const isBusy = loading || refreshing;
    const q = search.trim().toLowerCase();
    const filtered = cashiers.filter((c) => {
        if (!q)
            return true;
        return (c.fullName.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q));
    });
    return (<div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-neutral-700">
            {loading ? "…" : `${cashiers.length} cashiers`}
          </span>
          <span className="hidden text-neutral-300 sm:inline">|</span>
          <p className="text-sm text-neutral-500">
            Counter logins — usernames are saved in lowercase
          </p>
        </div>
        <div className="relative w-full min-w-[200px] sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"/>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or username…" className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50/80 pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:bg-white"/>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" disabled={isBusy} onClick={() => loadStaff(true)} className="h-9 gap-2 rounded-lg border-neutral-200">
            {refreshing ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<RefreshCw className="h-4 w-4"/>)}
            Refresh
          </Button>
          <Button type="button" onClick={openAdd} className="h-9 gap-2 rounded-lg bg-[#E31837] hover:bg-red-700">
            <UserPlus className="h-4 w-4"/>
            Add cashier
          </Button>
        </div>
      </div>

      {listError && (<div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700 lg:px-8">
          <AlertCircle className="h-4 w-4 shrink-0"/>
          {listError}
        </div>)}

      {refreshing && !loading && (<div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-5 py-2 text-xs text-neutral-600 lg:px-8">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E31837]"/>
          Updating list…
        </div>)}

      {loading ? (<SkeletonTable rows={8} cols={4}/>) : cashiers.length === 0 ? (<div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <Users className="mb-3 h-10 w-10 text-neutral-300"/>
          <p className="font-medium text-neutral-800">No cashiers yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            Create accounts for staff who will use the billing counter.
          </p>
          <Button type="button" onClick={openAdd} className="mt-5 gap-2 bg-[#E31837] hover:bg-red-700">
            <UserPlus className="h-4 w-4"/>
            Add cashier
          </Button>
        </div>) : filtered.length === 0 ? (<p className="py-16 text-center text-sm text-neutral-500">
          No cashiers match your search
        </p>) : (<div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-neutral-50">
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 lg:px-8">Cashier</th>
                <th className="px-5 py-3 lg:px-8">Username</th>
                <th className="px-5 py-3 lg:px-8">Joined</th>
                <th className="px-5 py-3 text-right lg:px-8">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (<CashierTableRow key={c.id} member={c} onEdit={() => setEditTarget(c)} onDelete={() => setDeleteTarget(c)}/>))}
            </tbody>
          </table>
        </div>)}

      
      <Modal open={addOpen} onClose={() => !submitting && setAddOpen(false)} title="Add Cashier" description="Username will be saved in lowercase">
        <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
          <FormAlerts error={formError} success={formSuccess}/>
          <UsernameFields register={addForm.register as UseFormRegister<StaffFormFields>} setValue={addForm.setValue as UseFormSetValue<StaffFormFields>} errors={addForm.formState.errors as FieldErrors<StaffFormFields>} showPassword/>
          <FormActions submitting={submitting} onCancel={() => setAddOpen(false)} submitLabel="Register"/>
        </form>
      </Modal>

      
      <Modal open={!!editTarget} onClose={() => !submitting && setEditTarget(null)} title="Edit Cashier" description={editTarget ? `@${editTarget.username}` : undefined}>
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          <FormAlerts error={formError} success={formSuccess}/>
          <UsernameFields register={editForm.register as UseFormRegister<StaffFormFields>} setValue={editForm.setValue as UseFormSetValue<StaffFormFields>} errors={editForm.formState.errors as FieldErrors<StaffFormFields>} showPassword passwordOptional/>
          <FormActions submitting={submitting} onCancel={() => setEditTarget(null)} submitLabel="Save Changes"/>
        </form>
      </Modal>

      
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Remove Cashier" description={deleteTarget
            ? `Remove ${deleteTarget.fullName} (@${deleteTarget.username})? They will no longer be able to sign in.`
            : undefined}>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-xl font-semibold">
            Cancel
          </Button>
          <Button type="button" disabled={deleting} onClick={onDeleteConfirm} className="h-11 flex-1 rounded-xl bg-red-600 font-semibold hover:bg-red-700">
            {deleting ? (<Loader2 className="h-5 w-5 animate-spin"/>) : (<>
                <Trash2 className="h-4 w-4"/>
                Delete
              </>)}
          </Button>
        </div>
      </Modal>
    </div>);
}
function CashierTableRow({ member, onEdit, onDelete, }: {
    member: StaffMember;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const initials = member.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return (<tr className="border-b border-neutral-100 transition-colors hover:bg-neutral-50/80">
      <td className="px-5 py-3.5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-[11px] font-bold text-white">
            {initials}
          </div>
          <span className="font-medium text-neutral-900">{member.fullName}</span>
        </div>
      </td>
      <td className="px-5 py-3.5 text-neutral-600 lg:px-8">@{member.username}</td>
      <td className="px-5 py-3.5 text-neutral-500 lg:px-8">
        {formatDate(member.createdAt)}
      </td>
      <td className="px-5 py-3.5 text-right lg:px-8">
        <div className="inline-flex gap-0.5">
          <button type="button" onClick={onEdit} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-[#E31837]" aria-label="Edit">
            <Pencil className="h-4 w-4"/>
          </button>
          <button type="button" onClick={onDelete} className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
            <Trash2 className="h-4 w-4"/>
          </button>
        </div>
      </td>
    </tr>);
}
function FormAlerts({ error, success, }: {
    error: string | null;
    success: string | null;
}) {
    return (<>
      {error && (<div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0"/>
          {error}
        </div>)}
      {success && (<div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0"/>
          {success}
        </div>)}
    </>);
}
function UsernameFields({ register, setValue, errors, showPassword, passwordOptional, }: {
    register: UseFormRegister<StaffFormFields>;
    setValue: UseFormSetValue<StaffFormFields>;
    errors: FieldErrors<StaffFormFields>;
    showPassword?: boolean;
    passwordOptional?: boolean;
}) {
    return (<>
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" placeholder="e.g. Ali Khan" className="rounded-xl border-neutral-200 bg-neutral-50" {...register("fullName")}/>
        {errors.fullName && (<p className="text-xs text-red-600">{errors.fullName.message}</p>)}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username (lowercase)</Label>
        <Input id="username" placeholder="e.g. cashier01" className="rounded-xl border-neutral-200 bg-neutral-50 lowercase" autoCapitalize="none" autoCorrect="off" spellCheck={false} {...register("username", {
        onChange: (e) => {
            setValue("username", sanitizeUsername(e.target.value), {
                shouldValidate: true,
            });
        },
    })}/>
        {errors.username && (<p className="text-xs text-red-600">{errors.username.message}</p>)}
      </div>
      {showPassword && (<div className="space-y-1.5">
          <Label htmlFor="password">
            Password{passwordOptional ? " (leave blank to keep)" : ""}
          </Label>
          <Input id="password" type="password" placeholder={passwordOptional ? "New password (optional)" : "Min. 6 characters"} className="rounded-xl border-neutral-200 bg-neutral-50" {...register("password")}/>
          {errors.password && (<p className="text-xs text-red-600">{errors.password.message}</p>)}
        </div>)}
    </>);
}
function FormActions({ submitting, onCancel, submitLabel, }: {
    submitting: boolean;
    onCancel: () => void;
    submitLabel: string;
}) {
    return (<div className="flex gap-3 pt-2">
      <Button type="button" variant="outline" disabled={submitting} onClick={onCancel} className="h-11 flex-1 rounded-xl font-semibold">
        Cancel
      </Button>
      <Button type="submit" disabled={submitting} className="h-11 flex-1 rounded-xl bg-[#E31837] font-semibold hover:bg-[#c91430]">
        {submitting ? (<Loader2 className="h-5 w-5 animate-spin"/>) : (submitLabel)}
      </Button>
    </div>);
}

