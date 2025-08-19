"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocaleStore } from "@/lib/locale-store"

export function LanguageToggle() {
  const { locale, setLocale } = useLocaleStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale('ko')}>
          <span className={locale === 'ko' ? 'font-semibold' : ''}>
            🇰🇷 한국어
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('en')}>
          <span className={locale === 'en' ? 'font-semibold' : ''}>
            🇺🇸 English
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}