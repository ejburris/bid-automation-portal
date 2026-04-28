import { Link } from "wouter";
import { BarChart3, Settings, Zap, FileText, AlertCircle, Clock, Activity, Plus, ChevronDown, Trophy, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export function DashboardNav() {
  const { isAuthenticated, logout } = useAuth();

  const navItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/bids", icon: FileText, label: "Bids" },
    { href: "/pipeline", icon: Columns3, label: "Pipeline" },
    { href: "/award-tracking", icon: Trophy, label: "Awards" },
    { href: "/parameters", icon: Settings, label: "Parameters" },
    { href: "/import", icon: Zap, label: "Import" },
    { href: "/new-bid", icon: Plus, label: "New Proposal" },
    { href: "/addendums", icon: AlertCircle, label: "Addendums" },
    { href: "/followups", icon: Clock, label: "Follow-ups" },
    { href: "/integration", icon: Activity, label: "Integration" },
  ];

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">Bid Automation Portal</h1>
          <div className="hidden md:flex gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-slate-800"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-slate-800 gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/settings/outlook">Outlook Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/google-drive">Google Drive Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/integration">Integration Status</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-gray-300 border-gray-600 hover:bg-slate-800"
            >
              Logout
            </Button>
          ) : (
            <a href={getLoginUrl()}>
              <Button size="sm">Login</Button>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
