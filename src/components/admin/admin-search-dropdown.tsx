"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, Users, Package, Receipt, LayoutGrid, Loader2, ArrowRight, } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { apiSearch, type SearchResponse } from "@/lib/api-client";
import { filterNavByQuery, setBillsSearchPrefill, } from "@/lib/admin-search";
import type { AdminSectionId } from "./admin-nav";
import { cn } from "@/lib/utils";
interface AdminSearchDropdownProps {
    onNavigate: (section: AdminSectionId) => void;
}
export function AdminSearchDropdown({ onNavigate }: AdminSearchDropdownProps) {
    const token = useAuthStore((s) => s.token);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navHits = useMemo(() => filterNavByQuery(query), [query]);
    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setFocused(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);
    useEffect(() => {
        if (!query.trim()) {
            setResults(null);
            setError(null);
            setLoading(false);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiSearch(token, query);
                setResults(data);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Search failed");
                setResults(null);
            }
            finally {
                setLoading(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [query, token]);
    const close = () => {
        setFocused(false);
        setQuery("");
    };
    const go = (section: AdminSectionId) => {
        close();
        onNavigate(section);
    };
    const hasQuery = query.trim().length > 0;
    const showPanel = focused;
    const totalCount = navHits.length +
        (results?.cashiers.length ?? 0) +
        (results?.products.length ?? 0) +
        (results?.bills.length ?? 0);
    return (<div ref={rootRef} className="relative w-full max-w-[280px] sm:max-w-[360px]">
      <div className={cn("flex items-center gap-2 rounded-lg border bg-neutral-50/80 px-3 py-1.5 transition-all", focused
            ? "border-[#E31837]/40 ring-2 ring-[#E31837]/10 bg-white"
            : "border-neutral-200")}>
        <Search className="h-4 w-4 shrink-0 text-neutral-400"/>
        <input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} placeholder="Search pages, bills, products…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" autoComplete="off"/>
        {loading && hasQuery && (<Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#E31837]"/>)}
      </div>

      {showPanel && (<div className="absolute right-0 top-[calc(100%+6px)] z-[200] w-[min(100vw-2rem,420px)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl" role="listbox">
          {!hasQuery ? (<p className="px-4 py-3 text-center text-xs text-neutral-500">
              Bills, products, cashiers, or page names
            </p>) : (<div className="scrollbar-modern max-h-[min(420px,55vh)] overflow-y-auto p-1.5">
              {error && (<p className="px-3 py-4 text-center text-sm text-red-600">
                  {error}
                </p>)}

              {!error && loading && !results && navHits.length === 0 && (<div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  Searching…
                </div>)}

              {navHits.length > 0 && (<Section title="Pages">
                  {navHits.map((item) => (<ResultButton key={item.id} icon={LayoutGrid} primary={item.label} secondary={item.group} onClick={() => go(item.id)}/>))}
                </Section>)}

              {results && results.bills.length > 0 && (<Section title="Bills">
                  {results.bills.map((b) => (<ResultButton key={b.id} icon={Receipt} primary={b.billNumber} secondary={b.label} onClick={() => {
                            setBillsSearchPrefill(b.billNumber);
                            go("bills");
                        }}/>))}
                </Section>)}

              {results && results.products.length > 0 && (<Section title="Products">
                  {results.products.map((p) => (<ResultButton key={p.id} icon={Package} primary={p.name} secondary={p.sku ? `Barcode ${p.sku}` : undefined} onClick={() => go("products")}/>))}
                </Section>)}

              {results && results.cashiers.length > 0 && (<Section title="Cashiers">
                  {results.cashiers.map((c) => (<ResultButton key={c.id} icon={Users} primary={c.fullName} secondary={`@${c.username}`} onClick={() => go("staff")}/>))}
                </Section>)}

              {!loading &&
                    !error &&
                    hasQuery &&
                    totalCount === 0 && (<p className="py-8 text-center text-sm text-neutral-500">
                    No results for &quot;{query}&quot;
                  </p>)}
            </div>)}
        </div>)}
    </div>);
}
function Section({ title, children, }: {
    title: string;
    children: ReactNode;
}) {
    return (<div className="mb-1">
      <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        {title}
      </p>
      {children}
    </div>);
}
function ResultButton({ icon: Icon, primary, secondary, onClick, }: {
    icon: typeof Search;
    primary: string;
    secondary?: string;
    onClick: () => void;
}) {
    return (<button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-red-50">
      <Icon className="h-4 w-4 shrink-0 text-[#E31837]"/>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900">
          {primary}
        </span>
        {secondary && (<span className="block truncate text-xs text-neutral-500">
            {secondary}
          </span>)}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-300"/>
    </button>);
}

