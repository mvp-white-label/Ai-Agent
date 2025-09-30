import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Electron React NextJS Auth',
  description: 'Desktop app with Microsoft 365 authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}



