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
  History,
  Users,
  Folder
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocaleStore } from "@/lib/locale-store"
import { useTranslation } from "@/lib/translations"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean
  onToggle: () => void
  onUploadClick?: () => void
}

export function Sidebar({ className, isCollapsed, onToggle, onUploadClick }: SidebarProps) {
  const pathname = usePathname()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)

  const routes: Array<{
    label: string
    icon: React.ComponentType<{ className?: string }>
    href: string
    badge?: string
  }> = [
    {
      label: locale === 'ko' ? '시작하기' : 'Getting Started',
      icon: Settings,
      href: "/settings",
    },
    {
      label: t.sidebar.team,
      icon: Users,
      href: "/team",
    },
    {
      label: locale === 'ko' ? '프로젝트' : 'Projects',
      icon: Folder,
      href: "/projects",
    },
    {
      label: t.sidebar.dashboard,
      icon: Home,
      href: "/",
      badge: locale === 'ko' ? '준비중' : 'Coming Soon',
    },
    {
      label: t.sidebar.myPrompts,
      icon: History,
      href: "/my-prompts",
      badge: locale === 'ko' ? '준비중' : 'Coming Soon',
    },
    {
      label: t.sidebar.reviews,
      icon: MessageSquare,
      href: "/reviews",
      badge: locale === 'ko' ? '준비중' : 'Coming Soon',
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
            <span className="font-semibold">{t.sidebar.title}</span>
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
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{route.label}</span>
                    {route.badge && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {route.badge}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>

      {!isCollapsed && (
        <div className="border-t p-4">
          <Button 
            className="w-full" 
            size="sm"
            onClick={onUploadClick}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t.sidebar.uploadHistory}
          </Button>
        </div>
      )}
    </div>
  )
}