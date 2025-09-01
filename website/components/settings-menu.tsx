"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings } from "lucide-react"

interface SettingsMenuProps {
  onLogout: () => void
  userEmail: string | null
}

export default function SettingsMenu({ onLogout, userEmail }: SettingsMenuProps) {
  const router = useRouter()

  const handleLogout = useCallback(() => {
    // Clear only Quirk app data, then go to create-account flow
    try {
      localStorage.removeItem("quirk_config")
      localStorage.removeItem("quirk_requests")
    } catch {}
    onLogout() // Call the parent logout handler
  }, [onLogout])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings" className="rounded-full bg-white/90">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {userEmail && (
          <DropdownMenuItem disabled className="text-xs text-gray-500 cursor-default">
            {userEmail}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
