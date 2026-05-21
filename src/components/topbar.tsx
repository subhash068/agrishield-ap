import { Search, Bell, Languages, Sparkles, CloudSun, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DISTRICTS } from "@/lib/mock-data";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 glass-strong px-3">
      <SidebarTrigger className="text-foreground" />

      <div className="relative ml-2 hidden md:block">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search parcels, farmers, mandals, schemes…"
          className="h-9 w-[340px] pl-8 bg-muted/40 border-border/60"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Select defaultValue="all">
          <SelectTrigger className="h-9 w-[140px] bg-muted/40 border-border/60 hidden sm:flex">
            <SelectValue placeholder="District" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9 gap-1.5 hidden lg:flex">
          <CloudSun className="h-4 w-4 text-accent" />
          <span className="text-xs">31°C · Vijayawada</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-destructive text-destructive-foreground">7</Badge>
        </Button>

        <Button variant="outline" size="sm" className="h-9 gap-1.5 border-primary/30 bg-primary/10 hover:bg-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs hidden sm:inline">AI Assistant</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-9 w-9" title="Language">
          <Languages className="h-4 w-4" />
        </Button>

        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center border border-border/60">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
