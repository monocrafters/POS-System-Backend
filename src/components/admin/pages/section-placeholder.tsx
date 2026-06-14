import type { LucideIcon } from "lucide-react";
interface SectionPlaceholderProps {
    title: string;
    description: string;
    icon: LucideIcon;
}
export function SectionPlaceholder({ title, description, icon: Icon, }: SectionPlaceholderProps) {
    return (<div className="flex min-h-[360px] w-full flex-col items-center justify-center border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <Icon className="h-8 w-8 text-[#E31837]"/>
      </div>
      <h2 className="mt-6 text-xl font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
      <span className="mt-6 rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold text-[#E31837]">
        Coming soon
      </span>
    </div>);
}

