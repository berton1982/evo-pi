import { Geist } from 'next/font/google'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AppProviders } from '@/shell/frame/providers'

import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = {
  title: 'evo-pi',
  description: 'evo-pi web app — workflow engine on top of pi ecosystem',
}

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
