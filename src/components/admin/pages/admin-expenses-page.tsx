"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Bell, CheckCircle2, CalendarClock, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SkeletonTable } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/cashier/analytics/analytics-charts";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminExpenses, apiCreateExpense, apiCreateRecurringExpense, apiUpdateExpense, apiUpdateRecurringExpense, apiDeleteExpense, apiDeleteRecurringExpense, apiMarkRecurringPaid, type ExpenseRecord, type ExpensePeriod, type ExpensesSummary, type RecurringExpenseRecord, } from "@/lib/api-client";
import { EXPENSE_CATEGORIES, PAY_FREQUENCIES, defaultFrequencyForCategory, type ExpenseCategoryId, type PayFrequencyId, } from "@/lib/expenses";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
const PERIOD_LABEL: Record<ExpensePeriod, string> = {
    day: "Today",
    week: "Last 7 days",
    month: "Last 30 days",
    year: "Last 12 months",
    all: "All time",
};
const REMIND_OPTIONS = [
    { value: 0, label: "On due date only" },
    { value: 1, label: "1 day before" },
    { value: 3, label: "3 days before" },
    { value: 7, label: "7 days before" },
    { value: 14, label: "14 days before" },
];
const RECURRING_FREQUENCIES = PAY_FREQUENCIES.filter((f) => f.id !== "once");
function formatExpenseDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
function toDateInput(iso?: string) {
    const d = iso ? new Date(iso) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
type PaymentFormState = {
    title: string;
    amount: string;
    category: ExpenseCategoryId;
    customCategory: string;
    note: string;
    expenseDate: string;
};
type ScheduleFormState = {
    title: string;
    amount: string;
    category: ExpenseCategoryId;
    customCategory: string;
    payFrequency: PayFrequencyId;
    nextDueDate: string;
    remindDaysBefore: string;
    note: string;
};
const emptyPaymentForm = (): PaymentFormState => ({
    title: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0].id,
    customCategory: "",
    note: "",
    expenseDate: toDateInput(),
});
const emptyScheduleForm = (category: ExpenseCategoryId = EXPENSE_CATEGORIES[0].id): ScheduleFormState => ({
    title: "",
    amount: "",
    category,
    customCategory: "",
    payFrequency: defaultFrequencyForCategory(category),
    nextDueDate: toDateInput(),
    remindDaysBefore: "3",
    note: "",
});
function DueBadge({ due }: {
    due: RecurringExpenseRecord["due"];
}) {
    const styles = {
        overdue: "bg-red-100 text-red-800 border-red-200",
        due_soon: "bg-amber-100 text-amber-900 border-amber-200",
        upcoming: "bg-sky-50 text-sky-800 border-sky-200",
        ok: "bg-neutral-100 text-neutral-600 border-neutral-200",
    };
    return (<span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", styles[due.status])}>
      {(due.status === "overdue" || due.status === "due_soon") && (<Bell className="h-3 w-3"/>)}
      {due.label}
    </span>);
}
export function AdminExpensesPage() {
    const token = useAuthStore((s) => s.token);
    const [period, setPeriod] = useState<ExpensePeriod>("month");
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [recurring, setRecurring] = useState<RecurringExpenseRecord[]>([]);
    const [reminders, setReminders] = useState<RecurringExpenseRecord[]>([]);
    const [summary, setSummary] = useState<ExpensesSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [paymentModal, setPaymentModal] = useState(false);
    const [scheduleModal, setScheduleModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<ExpenseRecord | null>(null);
    const [editingSchedule, setEditingSchedule] = useState<RecurringExpenseRecord | null>(null);
    const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
    const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const res = await apiAdminExpenses(token, period);
            setExpenses(res.expenses);
            setSummary(res.summary);
            setRecurring(res.recurring);
            setReminders(res.reminders);
        }
        catch {
            if (!isRefresh) {
                setExpenses([]);
                setSummary(null);
                setRecurring([]);
                setReminders([]);
            }
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, period]);
    useEffect(() => {
        void load();
    }, [load]);
    const openAddPayment = () => {
        setEditingPayment(null);
        setPaymentForm(emptyPaymentForm());
        setError("");
        setPaymentModal(true);
    };
    const openEditPayment = (e: ExpenseRecord) => {
        setEditingPayment(e);
        setPaymentForm({
            title: e.title,
            amount: String(e.amount),
            category: e.category as ExpenseCategoryId,
            customCategory: e.customCategory ?? "",
            note: e.note ?? "",
            expenseDate: toDateInput(e.expenseDate),
        });
        setError("");
        setPaymentModal(true);
    };
    const openAddSchedule = () => {
        setEditingSchedule(null);
        setScheduleForm(emptyScheduleForm());
        setError("");
        setScheduleModal(true);
    };
    const openEditSchedule = (s: RecurringExpenseRecord) => {
        setEditingSchedule(s);
        setScheduleForm({
            title: s.title,
            amount: String(s.amount),
            category: s.category as ExpenseCategoryId,
            customCategory: s.customCategory ?? "",
            payFrequency: s.payFrequency as PayFrequencyId,
            nextDueDate: toDateInput(s.nextDueDate),
            remindDaysBefore: String(s.remindDaysBefore),
            note: s.note ?? "",
        });
        setError("");
        setScheduleModal(true);
    };
    const onScheduleCategoryChange = (category: ExpenseCategoryId) => {
        setScheduleForm((f) => ({
            ...f,
            category,
            payFrequency: defaultFrequencyForCategory(category),
        }));
    };
    const savePayment = async () => {
        const title = paymentForm.title.trim();
        const amount = Number(paymentForm.amount);
        if (!title)
            return setError("Enter a title");
        if (!Number.isFinite(amount) || amount <= 0) {
            return setError("Enter a valid amount");
        }
        if (paymentForm.category === "other" &&
            !paymentForm.customCategory.trim()) {
            return setError("Enter a custom category name");
        }
        setSaving(true);
        setError("");
        const payload = {
            title,
            amount,
            category: paymentForm.category,
            customCategory: paymentForm.category === "other"
                ? paymentForm.customCategory.trim()
                : null,
            note: paymentForm.note.trim() || null,
            expenseDate: new Date(paymentForm.expenseDate).toISOString(),
            payFrequency: "once" as const,
        };
        try {
            if (editingPayment) {
                await apiUpdateExpense(token, editingPayment.id, payload);
            }
            else {
                await apiCreateExpense(token, payload);
            }
            setPaymentModal(false);
            await load(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        }
        finally {
            setSaving(false);
        }
    };
    const saveSchedule = async () => {
        const title = scheduleForm.title.trim();
        const amount = Number(scheduleForm.amount);
        if (!title)
            return setError("Enter a title");
        if (!Number.isFinite(amount) || amount <= 0) {
            return setError("Enter a valid amount");
        }
        if (scheduleForm.category === "other" &&
            !scheduleForm.customCategory.trim()) {
            return setError("Enter a custom category name");
        }
        setSaving(true);
        setError("");
        const payload = {
            title,
            amount,
            category: scheduleForm.category,
            customCategory: scheduleForm.category === "other"
                ? scheduleForm.customCategory.trim()
                : null,
            payFrequency: scheduleForm.payFrequency,
            nextDueDate: new Date(scheduleForm.nextDueDate).toISOString(),
            remindDaysBefore: Number(scheduleForm.remindDaysBefore),
            note: scheduleForm.note.trim() || null,
        };
        try {
            if (editingSchedule) {
                await apiUpdateRecurringExpense(token, editingSchedule.id, payload);
            }
            else {
                await apiCreateRecurringExpense(token, payload);
            }
            setScheduleModal(false);
            await load(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        }
        finally {
            setSaving(false);
        }
    };
    const markPaid = async (s: RecurringExpenseRecord) => {
        try {
            await apiMarkRecurringPaid(token, s.id, { amount: s.amount });
            await load(true);
        }
        catch {
        }
    };
    const removePayment = async (id: string) => {
        if (!confirm("Delete this payment record?"))
            return;
        try {
            await apiDeleteExpense(token, id);
            await load(true);
        }
        catch {
        }
    };
    const removeSchedule = async (id: string) => {
        if (!confirm("Remove this recurring bill? Payment history is kept.")) {
            return;
        }
        try {
            await apiDeleteRecurringExpense(token, id);
            await load(true);
        }
        catch {
        }
    };
    return (<div className="flex min-h-full w-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <PeriodSelector value={period === "all" ? "year" : period} onChange={(p) => setPeriod(p)}/>
        <button type="button" onClick={() => setPeriod("all")} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", period === "all"
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-200 text-neutral-500")}>
          All
        </button>
        <span className="text-sm text-neutral-500">{PERIOD_LABEL[period]}</span>
        <div className="flex-1"/>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={openAddSchedule}>
          <CalendarClock className="h-4 w-4"/>
          Recurring bill
        </Button>
        <Button type="button" size="sm" className="h-9 gap-2" onClick={openAddPayment}>
          <Plus className="h-4 w-4"/>
          Log payment
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={() => void load(true)}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100 sm:grid-cols-4">
        <Stat label="Spent (period)" value={formatMoney(summary?.total ?? 0)}/>
        <Stat label="Payments logged" value={String(summary?.count ?? 0)}/>
        <Stat label="Recurring bills" value={String(recurring.length)}/>
        <Stat label="Reminders" value={String(reminders.length)} tone={reminders.length > 0 ? "alert" : "normal"}/>
      </div>

      {reminders.length > 0 && (<div className="border-b border-amber-200 bg-amber-50 px-5 py-3 lg:px-8">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Bell className="h-4 w-4"/>
            Payment reminders
          </p>
          <ul className="space-y-2">
            {reminders.map((r) => (<li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">
                    {r.title}
                  </span>
                  <span className="ml-2 text-neutral-500">
                    {r.categoryLabel} · {formatMoney(r.amount)} ·{" "}
                    {r.payFrequencyLabel}
                  </span>
                  <div className="mt-1">
                    <DueBadge due={r.due}/>
                    <span className="ml-2 text-xs text-neutral-500">
                      Next: {formatExpenseDate(r.nextDueDate)}
                    </span>
                  </div>
                </div>
                <Button type="button" size="sm" className="h-8 gap-1" onClick={() => void markPaid(r)}>
                  <CheckCircle2 className="h-3.5 w-3.5"/>
                  Mark paid
                </Button>
              </li>))}
          </ul>
        </div>)}

      <div className="border-b border-neutral-200 px-5 py-3 lg:px-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Recurring bills (rent, salary, utilities…)
        </p>
        {recurring.length === 0 ? (<p className="text-sm text-neutral-500">
            No recurring bills yet. Add rent, salaries, or any cost with a pay
            schedule and due date — you will get reminders before each due date.
          </p>) : (<div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="py-2 text-left">Bill</th>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-left">How often</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-left">Next due</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recurring.map((r) => (<tr key={r.id} className="border-b border-neutral-100">
                    <td className="py-2.5 font-medium">{r.title}</td>
                    <td className="py-2.5 text-neutral-600">{r.categoryLabel}</td>
                    <td className="py-2.5 text-neutral-600">
                      {r.payFrequencyLabel}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {formatExpenseDate(r.nextDueDate)}
                    </td>
                    <td className="py-2.5">
                      <DueBadge due={r.due}/>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" title="Mark paid" onClick={() => void markPaid(r)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4"/>
                        </button>
                        <button type="button" onClick={() => openEditSchedule(r)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100">
                          <Pencil className="h-4 w-4"/>
                        </button>
                        <button type="button" onClick={() => void removeSchedule(r.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
      </div>

      <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 lg:px-8">
        Payment history · {PERIOD_LABEL[period]}
      </div>

      {loading ? (<SkeletonTable rows={8} cols={5}/>) : expenses.length === 0 ? (<p className="py-12 text-center text-sm text-neutral-500">
          No payments logged in this period.
        </p>) : (<div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-neutral-50">
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 lg:px-6">Date</th>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right lg:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (<tr key={e.id} className="border-b border-neutral-100 hover:bg-neutral-50/80">
                  <td className="px-4 py-3 tabular-nums text-neutral-600 lg:px-6">
                    {formatExpenseDate(e.expenseDate)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-neutral-900">{e.title}</p>
                    {e.note && (<p className="text-xs text-neutral-400">{e.note}</p>)}
                    {e.payFrequencyLabel && (<p className="text-xs text-neutral-400">
                        {e.payFrequencyLabel}
                      </p>)}
                  </td>
                  <td className="px-3 py-3 text-neutral-600">
                    {e.categoryLabel}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#E31837]">
                    {formatMoney(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right lg:px-6">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => openEditPayment(e)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100">
                        <Pencil className="h-4 w-4"/>
                      </button>
                      <button type="button" onClick={() => void removePayment(e.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title={editingPayment ? "Edit payment" : "Log one-time payment"} description="Stock purchases, one-off costs, or any payment that does not repeat.">
        <ExpenseFields form={paymentForm} setForm={setPaymentForm} showFrequency={false} error={error} saving={saving} onCancel={() => setPaymentModal(false)} onSave={() => void savePayment()} saveLabel={editingPayment ? "Update" : "Save payment"}/>
      </Modal>

      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title={editingSchedule ? "Edit recurring bill" : "Add recurring bill"} description="Set how often you pay (monthly rent, yearly insurance, etc.) and the next due date. Reminders appear before each due date.">
        <ScheduleFields form={scheduleForm} setForm={setScheduleForm} onCategoryChange={onScheduleCategoryChange} error={error} saving={saving} onCancel={() => setScheduleModal(false)} onSave={() => void saveSchedule()} saveLabel={editingSchedule ? "Update" : "Save bill"}/>
      </Modal>
    </div>);
}
function Stat({ label, value, tone = "normal", }: {
    label: string;
    value: string;
    tone?: "normal" | "alert";
}) {
    return (<div className="bg-white px-5 py-3 lg:px-6">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", tone === "alert" ? "text-amber-700" : "text-neutral-900")}>
        {value}
      </p>
    </div>);
}
function CategoryFields({ category, customCategory, onCategory, onCustom, }: {
    category: ExpenseCategoryId;
    customCategory: string;
    onCategory: (v: ExpenseCategoryId) => void;
    onCustom: (v: string) => void;
}) {
    return (<>
      <label className="block text-sm">
        <span className="text-neutral-600">Category</span>
        <select value={category} onChange={(ev) => onCategory(ev.target.value as ExpenseCategoryId)} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3">
          {EXPENSE_CATEGORIES.map((c) => (<option key={c.id} value={c.id}>
              {c.label}
            </option>))}
        </select>
      </label>
      {category === "other" && (<label className="block text-sm">
          <span className="text-neutral-600">Custom category name</span>
          <input value={customCategory} onChange={(ev) => onCustom(ev.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3" placeholder="e.g. Equipment lease"/>
        </label>)}
    </>);
}
function ExpenseFields({ form, setForm, showFrequency, error, saving, onCancel, onSave, saveLabel, }: {
    form: ReturnType<typeof emptyPaymentForm>;
    setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyPaymentForm>>>;
    showFrequency: boolean;
    error: string;
    saving: boolean;
    onCancel: () => void;
    onSave: () => void;
    saveLabel: string;
}) {
    return (<div className="space-y-3">
      <label className="block text-sm">
        <span className="text-neutral-600">Title</span>
        <input value={form.title} onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3" placeholder="e.g. March electricity bill"/>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-neutral-600">Amount (Rs)</span>
          <input type="number" min={0} step="0.01" value={form.amount} onChange={(ev) => setForm((f) => ({ ...f, amount: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 tabular-nums"/>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Payment date</span>
          <input type="date" value={form.expenseDate} onChange={(ev) => setForm((f) => ({ ...f, expenseDate: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3"/>
        </label>
      </div>
      <CategoryFields category={form.category} customCategory={form.customCategory} onCategory={(category) => setForm((f) => ({ ...f, category }))} onCustom={(customCategory) => setForm((f) => ({ ...f, customCategory }))}/>
      {showFrequency && null}
      <label className="block text-sm">
        <span className="text-neutral-600">Note (optional)</span>
        <input value={form.note} onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3"/>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>);
}
function ScheduleFields({ form, setForm, onCategoryChange, error, saving, onCancel, onSave, saveLabel, }: {
    form: ReturnType<typeof emptyScheduleForm>;
    setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyScheduleForm>>>;
    onCategoryChange: (category: ExpenseCategoryId) => void;
    error: string;
    saving: boolean;
    onCancel: () => void;
    onSave: () => void;
    saveLabel: string;
}) {
    return (<div className="space-y-3">
      <label className="block text-sm">
        <span className="text-neutral-600">Title</span>
        <input value={form.title} onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3" placeholder="e.g. Shop rent"/>
      </label>
      <label className="block text-sm">
        <span className="text-neutral-600">Amount per payment (Rs)</span>
        <input type="number" min={0} step="0.01" value={form.amount} onChange={(ev) => setForm((f) => ({ ...f, amount: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 tabular-nums"/>
      </label>
      <CategoryFields category={form.category} customCategory={form.customCategory} onCategory={(category) => {
            onCategoryChange(category);
            setForm((f) => ({ ...f, category }));
        }} onCustom={(customCategory) => setForm((f) => ({ ...f, customCategory }))}/>
      <label className="block text-sm">
        <span className="text-neutral-600">How often to pay</span>
        <select value={form.payFrequency} onChange={(ev) => setForm((f) => ({
            ...f,
            payFrequency: ev.target.value as PayFrequencyId,
        }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3">
          {RECURRING_FREQUENCIES.map((f) => (<option key={f.id} value={f.id}>
              {f.label}
            </option>))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-neutral-600">Next due date</span>
          <input type="date" value={form.nextDueDate} onChange={(ev) => setForm((f) => ({ ...f, nextDueDate: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3"/>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Remind me</span>
          <select value={form.remindDaysBefore} onChange={(ev) => setForm((f) => ({ ...f, remindDaysBefore: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3">
            {REMIND_OPTIONS.map((o) => (<option key={o.value} value={String(o.value)}>
                {o.label}
              </option>))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-neutral-600">Note (optional)</span>
        <input value={form.note} onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3"/>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>);
}

