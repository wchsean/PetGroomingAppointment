import type { Metadata } from 'next'
import { MainLayout } from "@/components/main-layout"
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily Appiontment',
  description: 'A simple app for managing daily appointments',
  icons: {
    icon: '/dog-icon.png', 
    shortcut: '/dog-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body><MainLayout>{children}</MainLayout></body>
    </html>
  )
}
