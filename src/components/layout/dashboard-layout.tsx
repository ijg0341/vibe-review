"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  onUploadClick?: () => void
  fullWidth?: boolean
}

export function DashboardLayout({ children, onUploadClick, fullWidth = false }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggle={() => setIsCollapsed(!isCollapsed)} 
        onUploadClick={onUploadClick}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-muted/10">
          {fullWidth ? (
            <div className="h-full">
              {children}
            </div>
          ) : (
            <div className="container mx-auto p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}