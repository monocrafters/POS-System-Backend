import { cn } from "@/lib/utils";
export function Skeleton({ className }: {
    className?: string;
}) {
    return (<div className={cn("animate-pulse rounded-md bg-neutral-200/70", className)}/>);
}
export function SkeletonText({ className }: {
    className?: string;
}) {
    return <Skeleton className={cn("h-4 w-full", className)}/>;
}
export function SkeletonRow() {
    return (<div className="flex items-center gap-3 py-3.5">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg"/>
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5"/>
        <Skeleton className="h-3 w-1/3"/>
      </div>
      <Skeleton className="h-5 w-16 shrink-0"/>
    </div>);
}
export function SkeletonRows({ count = 6 }: {
    count?: number;
}) {
    return (<div className="divide-y divide-neutral-100">
      {Array.from({ length: count }).map((_, i) => (<SkeletonRow key={i}/>))}
    </div>);
}
export function SkeletonStatStrip() {
    return (<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="space-y-2 py-1">
          <Skeleton className="h-3 w-16"/>
          <Skeleton className="h-7 w-24"/>
        </div>))}
    </div>);
}
export function SkeletonTable({ rows = 8, cols = 5, }: {
    rows?: number;
    cols?: number;
}) {
    return (<div className="w-full">
      <div className="flex gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-3 lg:px-8">
        {Array.from({ length: cols }).map((_, i) => (<Skeleton key={i} className="h-3 flex-1"/>))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (<div key={r} className="flex gap-4 border-b border-neutral-100 px-5 py-4 lg:px-8">
          {Array.from({ length: cols }).map((_, c) => (<Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[40%]")}/>))}
        </div>))}
    </div>);
}
export function SkeletonSettingsRows({ rows = 2 }: {
    rows?: number;
}) {
    return (<div className="divide-y divide-neutral-200 border-b border-neutral-200">
      {Array.from({ length: rows }).map((_, i) => (<div key={i} className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40"/>
            <Skeleton className="h-3 w-56"/>
          </div>
          <Skeleton className="h-8 w-24 shrink-0"/>
        </div>))}
    </div>);
}
export function SkeletonReceiptPreview() {
    return (<div className="flex min-h-[320px] items-start justify-center bg-neutral-50/80 px-6 py-8 lg:px-10">
      <Skeleton className="h-[380px] w-[280px] rounded-sm"/>
    </div>);
}

