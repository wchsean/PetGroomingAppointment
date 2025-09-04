"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Calendar, Users, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    name: "Daily Appointments",
    href: "/",
    icon: Calendar,
  },
  {
    name: "Customer Management",
    href: "/customer-management",
    icon: Users,
  },
]

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top menu */}
      <div className={cn("sticky top-0 z-40 md:hidden bg-white shadow", sidebarOpen ? "block" : "hidden")}>
        <div className="px-4 py-2 flex justify-between items-center border-b">
          <h1 className="text-lg font-semibold text-gray-900">Pet Grooming</h1>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex flex-col p-4 space-y-1">
          {navigation.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "justify-start",
                pathname === item.href ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-50"
              )}
              onClick={() => {
                router.push(item.href)
                setSidebarOpen(false)
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          ))}
        </nav>
      </div>

      {/* Desktop top bar */}
      <div className="hidden md:flex h-16 bg-white border-b shadow">
        <div className="flex items-center justify-between w-full px-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pet Grooming</h1>
            <p className="text-sm text-gray-600">Management System</p>
          </div>
          <nav className="flex space-x-2">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className={cn(
                  pathname === item.href ? "bg-blue-100 text-blue-900" : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
