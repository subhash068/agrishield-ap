import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  icon, eyebrow, title, description, actions,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border/60 px-6 lg:px-10 py-6">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)", opacity: 0.6 }} />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary mb-2">
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight flex items-center gap-3">
            {icon}
            <span>{title}</span>
          </h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
