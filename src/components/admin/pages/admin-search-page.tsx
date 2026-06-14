"use client";
import { useEffect, useState } from "react";
import { Search, Users, Package, Receipt, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { apiSearch, type SearchResponse } from "@/lib/api-client";
interface AdminSearchPageProps {
    query: string;
    onQueryChange: (q: string) => void;
}
export function AdminSearchPage({ query, onQueryChange, }: AdminSearchPageProps) {
    const token = useAuthStore((s) => s.token);
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!query.trim()) {
            setResults(null);
            setError(null);
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
        }, 280);
        return () => clearTimeout(timer);
    }, [query, token]);
    return (<div className="space-y-5">
      <div className="border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
            <Search className="h-5 w-5 text-[#E31837]"/>
          </div>
          <div className="flex-1">
            <input type="search" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search cashiers, products, bills…" autoFocus className="w-full border-0 bg-transparent text-lg font-semibold text-neutral-900 outline-none placeholder:text-neutral-400"/>
            <p className="text-xs text-neutral-500">
              Results update as you type
            </p>
          </div>
          {loading && (<Loader2 className="h-5 w-5 animate-spin text-[#E31837]"/>)}
        </div>
      </div>

      {error && (<p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>)}

      {!query.trim() ? (<div className="border border-dashed border-neutral-200 bg-neutral-50/50 py-16 text-center">
          <Search className="mx-auto h-10 w-10 text-neutral-300"/>
          <p className="mt-3 text-sm font-medium text-neutral-600">
            Start typing to search
          </p>
        </div>) : loading && !results ? (<div className="space-y-3">
          {[1, 2, 3].map((i) => (<div key={i} className="h-16 animate-pulse rounded-xl bg-white border border-neutral-100"/>))}
        </div>) : results && results.totalResults === 0 ? (<div className="border border-neutral-200 bg-white py-12 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No results for &quot;{query}&quot;
          </p>
        </div>) : (results && (<div className="space-y-6">
            <ResultSection title="Cashiers" icon={Users} count={results.cashiers.length}>
              {results.cashiers.map((c) => (<div key={c.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xs font-bold text-white">
                    {c.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {c.fullName}
                    </p>
                    <p className="text-sm text-neutral-500">@{c.username}</p>
                  </div>
                  <span className="ml-auto rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-[#E31837]">
                    Cashier
                  </span>
                </div>))}
            </ResultSection>

            {results.products.length > 0 && (<ResultSection title="Products" icon={Package} count={results.products.length}>
                {results.products.map((p) => (<div key={p.id} className="rounded-xl border border-neutral-100 px-4 py-3 text-sm font-medium">
                    {p.name}
                  </div>))}
              </ResultSection>)}

            {results.bills.length > 0 && (<ResultSection title="Bills" icon={Receipt} count={results.bills.length}>
                {results.bills.map((b) => (<div key={b.id} className="rounded-xl border border-neutral-100 px-4 py-3 text-sm">
                    {b.label}
                  </div>))}
              </ResultSection>)}
          </div>))}
    </div>);
}
function ResultSection({ title, icon: Icon, count, children, }: {
    title: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
    count: number;
    children: React.ReactNode;
}) {
    if (count === 0)
        return null;
    return (<div className="border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3">
        <Icon className="h-4 w-4 text-[#E31837]"/>
        <h3 className="font-bold text-neutral-900">{title}</h3>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-[#E31837]">
          {count}
        </span>
      </div>
      <div className="space-y-2 p-3">{children}</div>
    </div>);
}

