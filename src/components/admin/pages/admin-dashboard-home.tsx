"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, PackageX, Bell, Wallet, Receipt, Package, Users, TrendingUp, BarChart3, ArrowRight, RefreshCw, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonStatStrip } from "@/components/ui/skeleton";
import { SalesBarChart } from "@/components/cashier/analytics/analytics-charts";
import { useAuthStore } from "@/store/auth-store";
import { apiAdminAnalytics, apiAdminExpenses, apiAdminStockAnalytics, apiFetchStaff, type RecurringExpenseRecord, type StockAnalyticsRow, } from "@/lib/api-client";
import { formatMoney } from "@/lib/receipt";
import { cn } from "@/lib/utils";
import type { ChartPoint } from "@/lib/analytics/sales-series";
import type { AdminSectionId } from "../admin-nav";
interface AdminDashboardHomeProps {
    onNavigate: (id: AdminSectionId) => void;
}
function formatBillTime(iso: string) {
    return new Date(iso).toLocaleString("en-PK", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function formatDueDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
export function AdminDashboardHome({ onNavigate }: AdminDashboardHomeProps) {
    const token = useAuthStore((s) => s.token);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todayNet, setTodayNet] = useState(0);
    const [todayProfit, setTodayProfit] = useState(0);
    const [todayBills, setTodayBills] = useState(0);
    const [todayItems, setTodayItems] = useState(0);
    const [weekSales, setWeekSales] = useState(0);
    const [chartWeek, setChartWeek] = useState<ChartPoint[]>([]);
    const [recentBills, setRecentBills] = useState<{
        billNumber: string;
        total: number;
        cashierName: string;
        createdAt: string;
    }[]>([]);
    const [topToday, setTopToday] = useState<{
        name: string;
        quantity: number;
        revenue: number;
        profit: number;
    }[]>([]);
    const [stockSummary, setStockSummary] = useState({
        total: 0,
        out: 0,
        low: 0,
        unitsToOrder: 0,
    });
    const [stockAlerts, setStockAlerts] = useState<StockAnalyticsRow[]>([]);
    const [expenseReminders, setExpenseReminders] = useState<RecurringExpenseRecord[]>([]);
    const [staffCount, setStaffCount] = useState(0);
    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh)
            setRefreshing(true);
        else
            setLoading(true);
        try {
            const [analytics, stock, expenses, staff] = await Promise.all([
                apiAdminAnalytics(token),
                apiAdminStockAnalytics(token),
                apiAdminExpenses(token, "month"),
                apiFetchStaff(token).catch(() => ({ cashiers: [] as {
                        id: string;
                    }[] })),
            ]);
            const a = analytics.analytics;
            setTodayNet(a.today.netRevenue);
            setTodayProfit(a.today.grossProfit);
            setTodayBills(a.today.bills);
            setTodayItems(a.today.itemsSold);
            setWeekSales(a.series.week.reduce((s, d) => s + d.sales, 0));
            setChartWeek(a.series.week);
            setRecentBills(a.recentBills.slice(0, 8));
            setTopToday(a.topProductsByPeriod.day.slice(0, 5));
            setStockSummary(stock.summary);
            const alerts = stock.products
                .filter((p) => p.status === "out" || p.status === "low")
                .sort((x, y) => {
                if (x.status === "out" && y.status !== "out")
                    return -1;
                if (y.status === "out" && x.status !== "out")
                    return 1;
                return x.stock - y.stock;
            })
                .slice(0, 8);
            setStockAlerts(alerts);
            setExpenseReminders(expenses.reminders);
            setStaffCount(staff.cashiers?.length ?? 0);
        }
        catch {
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);
    useEffect(() => {
        void load();
    }, [load]);
    const hasStockAlerts = stockSummary.out > 0 || stockSummary.low > 0;
    const hasExpenseReminders = expenseReminders.length > 0;
    const hasAlerts = hasStockAlerts || hasExpenseReminders;
    const outProducts = useMemo(() => stockAlerts.filter((p) => p.status === "out"), [stockAlerts]);
    const lowProducts = useMemo(() => stockAlerts.filter((p) => p.status === "low"), [stockAlerts]);
    if (loading) {
        return (<div className="flex min-h-full w-full flex-col">
        <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
          <Skeleton className="mb-3 h-16 w-full rounded-lg"/>
          <Skeleton className="h-16 w-full rounded-lg"/>
        </div>
        <div className="border-b border-neutral-200 px-5 py-4 lg:px-8">
          <SkeletonStatStrip />
        </div>
        <Skeleton className="m-5 h-48 lg:mx-8"/>
      </div>);
    }
    return (<div className="flex min-h-full w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 lg:px-8">
        <p className="text-sm text-neutral-500">Shop overview · live data</p>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={refreshing} onClick={() => void load(true)}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")}/>
          Refresh
        </Button>
      </div>

      {hasAlerts && (<div className="space-y-3 border-b border-neutral-200 bg-neutral-50/90 px-5 py-4 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Reminders
          </p>

          {stockSummary.out > 0 && (<ReminderCard variant="danger" icon={PackageX} title={`${stockSummary.out} product${stockSummary.out === 1 ? "" : "s"} out of stock`} description="These items cannot be sold until stock is added." actionLabel="View stock" onAction={() => onNavigate("stock-analytics")}>
              <ul className="mt-2 space-y-1 text-sm">
                {outProducts.slice(0, 5).map((p) => (<li key={p.id} className="flex justify-between gap-2">
                    <span className="font-medium text-neutral-800">
                      {p.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-red-700">
                      0 in hand
                    </span>
                  </li>))}
                {stockSummary.out > 5 && (<li className="text-xs text-neutral-500">
                    +{stockSummary.out - 5} more
                  </li>)}
              </ul>
            </ReminderCard>)}

          {stockSummary.low > 0 && (<ReminderCard variant="warning" icon={AlertTriangle} title={`${stockSummary.low} product${stockSummary.low === 1 ? "" : "s"} low on stock`} description="Reorder soon to avoid running out." actionLabel="View stock" onAction={() => onNavigate("stock-analytics")}>
              <ul className="mt-2 space-y-1 text-sm">
                {lowProducts.slice(0, 5).map((p) => (<li key={p.id} className="flex justify-between gap-2">
                    <span className="text-neutral-800">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-amber-800">
                      {p.stock} left
                      {p.orderQty > 0 ? ` · order ${p.orderQty}` : ""}
                    </span>
                  </li>))}
                {stockSummary.low > 5 && (<li className="text-xs text-neutral-500">
                    +{stockSummary.low - 5} more
                  </li>)}
              </ul>
            </ReminderCard>)}

          {hasExpenseReminders && (<ReminderCard variant="warning" icon={Bell} title={`${expenseReminders.length} payment${expenseReminders.length === 1 ? "" : "s"} due soon`} description="Recurring bills need attention." actionLabel="View expenses" onAction={() => onNavigate("expenses")}>
              <ul className="mt-2 space-y-2 text-sm">
                {expenseReminders.slice(0, 5).map((r) => (<li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-medium text-neutral-900">
                        {r.title}
                      </span>
                      <span className="ml-2 text-neutral-500">
                        {formatMoney(r.amount)} · {r.payFrequencyLabel}
                      </span>
                    </span>
                    <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", r.due.status === "overdue"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900")}>
                      {r.due.label} · {formatDueDate(r.nextDueDate)}
                    </span>
                  </li>))}
              </ul>
            </ReminderCard>)}
        </div>)}

      <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-100 sm:grid-cols-4">
        <StatCell label="Today sales" value={formatMoney(todayNet)}/>
        <StatCell label="Today profit" value={formatMoney(todayProfit)}/>
        <StatCell label="Today bills" value={String(todayBills)}/>
        <StatCell label="Week sales" value={formatMoney(weekSales)}/>
      </div>

      {stockSummary.unitsToOrder > 0 && (<div className="border-b border-neutral-100 bg-white px-5 py-2.5 text-sm text-neutral-600 lg:px-8">
          Suggested order across catalog:{" "}
          <button type="button" onClick={() => onNavigate("stock-analytics")} className="font-semibold text-[#E31837] hover:underline">
            ~{stockSummary.unitsToOrder} units
          </button>
        </div>)}

      <div className="grid lg:grid-cols-[1fr_320px] lg:divide-x lg:divide-neutral-200">
        <div className="border-b border-neutral-200 px-5 py-4 lg:border-b-0 lg:px-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-800">
              Sales · last 7 days
            </p>
            <button type="button" onClick={() => onNavigate("sales-analytics")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#E31837] hover:underline">
              Full analytics
              <ArrowRight className="h-3 w-3"/>
            </button>
          </div>
          <SalesBarChart days={chartWeek}/>
        </div>

        <div className="px-5 py-4 lg:px-8">
          <p className="mb-3 text-sm font-medium text-neutral-800">
            Quick links
          </p>
          <div className="grid gap-2">
            {([
            ["Bills", Receipt, "bills"],
            ["Products", Package, "products"],
            ["Stock analytics", BarChart3, "stock-analytics"],
            ["Sales analytics", TrendingUp, "sales-analytics"],
            ["Expenses", Wallet, "expenses"],
            ["Settings", Users, "settings"],
        ] as const).map(([label, Icon, id]) => (<button key={id} type="button" onClick={() => onNavigate(id as AdminSectionId)} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50">
                <Icon className="h-4 w-4 shrink-0 text-[#E31837]"/>
                {label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-neutral-400"/>
              </button>))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-neutral-200">
        <div className="border-b border-neutral-200 px-5 py-4 lg:border-b-0 lg:px-8">
          <p className="mb-3 text-sm font-medium text-neutral-800">
            Top products today
          </p>
          {topToday.length === 0 ? (<p className="text-sm text-neutral-500">No sales yet today</p>) : (<ul className="divide-y divide-neutral-100">
              {topToday.map((p, i) => (<li key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-neutral-800">
                    <span className="mr-2 text-neutral-300">{i + 1}</span>
                    {p.name}
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{formatMoney(p.revenue)}</span>
                    {p.profit > 0 && (<span className="text-xs text-green-700">+{formatMoney(p.profit)} profit</span>)}
                  </span>
                </li>))}
            </ul>)}
        </div>

        <div className="px-5 py-4 lg:px-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-800">Recent bills</p>
            <button type="button" onClick={() => onNavigate("bills")} className="text-xs font-semibold text-[#E31837] hover:underline">
              View all
            </button>
          </div>
          {recentBills.length === 0 ? (<p className="text-sm text-neutral-500">No bills yet</p>) : (<ul className="divide-y divide-neutral-100">
              {recentBills.map((b) => (<li key={b.billNumber} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-neutral-700">
                      {b.billNumber}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {b.cashierName} · {formatBillTime(b.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(b.total)}
                  </span>
                </li>))}
            </ul>)}
        </div>
      </div>
    </div>);
}
function ReminderCard({ variant, icon: Icon, title, description, actionLabel, onAction, children, }: {
    variant: "danger" | "warning";
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    children?: ReactNode;
}) {
    const styles = {
        danger: "border-red-200 bg-red-50/80",
        warning: "border-amber-200 bg-amber-50/80",
    };
    const iconStyles = {
        danger: "text-red-700",
        warning: "text-amber-800",
    };
    return (<div className={cn("rounded-lg border px-4 py-3", styles[variant])} role="alert">
      <div className="flex flex-wrap items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[variant])}/>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="mt-0.5 text-xs text-neutral-600">{description}</p>
          {children}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 border-neutral-300 bg-white text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>);
}
function StatCell({ label, value }: {
    label: string;
    value: string;
}) {
    return (<div className="bg-white px-4 py-3 lg:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">
        {value}
      </p>
    </div>);
}

