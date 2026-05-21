import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Satellite, ScanLine, Map, CloudSun, Users,
  MessageSquareWarning, ShieldAlert, FileBarChart2, Landmark,
  Settings, Sparkles, Leaf,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navMain = [
  { title: "Home",                url: "/",             icon: LayoutDashboard },
  { title: "Crop Surveillance",   url: "/surveillance", icon: Leaf },
  { title: "Satellite Monitoring",url: "/satellite",    icon: Satellite },
  { title: "AI Disease Detection",url: "/disease",      icon: ScanLine },
  { title: "Parcel Intelligence", url: "/parcels",      icon: Map },
  { title: "Weather Intelligence",url: "/weather",      icon: CloudSun },
];
const navOps = [
  { title: "Farmer Services",     url: "/farmers",      icon: Users },
  { title: "Advisory System",     url: "/advisory",     icon: MessageSquareWarning },
  { title: "Mandal Surveillance", url: "/mandal",       icon: ShieldAlert },
  { title: "AI Predictions",      url: "/predictions",  icon: Sparkles },
  { title: "Reports & Analytics", url: "/reports",      icon: FileBarChart2 },
  { title: "Government Dashboard",url: "/government",   icon: Landmark },
  { title: "Settings",            url: "/settings",     icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));

  const renderItem = (item: typeof navMain[number]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success pulse-ring" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">AgriShield <span className="gradient-text">AP</span></span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">AP Agri Intelligence</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{navMain.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{navOps.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-2 py-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              SATELLITE LINK ACTIVE
            </div>
            <div className="mt-0.5">Sentinel-2 · Landsat-9</div>
          </div>
        ) : (
          <div className="grid place-items-center py-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
