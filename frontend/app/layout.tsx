import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'V8 Optimization Lab',
  description: 'Interactive learning environment for V8 JIT optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    V8 Optimization Lab
                  </span>
                </Link>
                <nav className="flex space-x-6">
                  <Link
                    href="/docs"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    Docs
                  </Link>
                  <Link
                    href="/experiments"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    Experiments
                  </Link>
                  <Link
                    href="/runs"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    Runs
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
