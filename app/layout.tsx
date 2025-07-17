import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'daily appiontment',
  description: 'A simple app for managing daily appointments',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
