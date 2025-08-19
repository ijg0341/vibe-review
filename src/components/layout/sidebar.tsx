"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Home, 
  Upload, 
  FolderOpen, 
  MessageSquare, 
  Settings,
  ChevronLeft,
  Plus,
  History
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ className, isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/",
    },
    {
      label: "Upload",
      icon: Upload,
      href: "/upload",
    },
    {
      label: "Projects",
      icon: FolderOpen,
      href: "/projects",
    },
    {
      label: "History",
      icon: History,
      href: "/history",
    },
    {
      label: "Reviews",
      icon: MessageSquare,
      href: "/reviews",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ]

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r bg-background",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">V</span>
            </div>
            <span className="font-semibold">Vibe Review</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "h-8 w-8",
            isCollapsed && "mx-auto"
          )}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <div className="space-y-1 px-3">
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
              <Button
                variant={pathname === route.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <route.icon className={cn(
                  "h-4 w-4",
                  !isCollapsed && "mr-2"
                )} />
                {!isCollapsed && route.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>

      {!isCollapsed && (
        <div className="border-t p-4">
          <Button className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      )}
    </div>
  )
}