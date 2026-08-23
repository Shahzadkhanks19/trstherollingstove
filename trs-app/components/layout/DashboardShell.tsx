import Link from "next/link";

import type { NavigationItem } from "@/config/navigation";

type DashboardShellProps = {
  title: string;
  navigation: NavigationItem[];
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function DashboardShell({
  title,
  navigation,
  children,
  footer,
}: DashboardShellProps) {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href="/">
          <span className="dashboard-brand-mark">TRS</span>
          <span>
            <strong>The Rolling Stove</strong>
            <small>{title}</small>
          </span>
        </Link>

        <nav aria-label={`${title} navigation`}>
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        {footer ? <div className="dashboard-sidebar-footer">{footer}</div> : null}
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div>
            <small>The Rolling Stove</small>
            <strong>{title}</strong>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
  );
}
