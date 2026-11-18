import { cn } from "cn";

/**
 * App-shell sidebar. Fixed height (h-svh) with its own scroll region, so the
 * page content scrolls independently of the navigation.
 */
export function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn("flex h-svh w-64 shrink-0 flex-col border-r border-border/60 bg-background", className)}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("shrink-0 border-b border-border/60 p-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-lenis-prevent
      className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2", className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("shrink-0 border-t border-border/60 p-3", className)} {...props} />;
}

export function SidebarGroup({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <p className="px-2.5 pb-1 pt-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      ) : null}
      {children}
    </div>
  );
}

/** Row layout: fixed sidebar + scrollable main. */
export function SidebarLayout({
  sidebar,
  className,
  children,
}: {
  sidebar: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex h-svh overflow-hidden", className)}>
      {sidebar}
      <main data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
