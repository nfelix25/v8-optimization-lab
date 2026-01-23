import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Node.js V8 JIT Optimization Laboratory
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          A comprehensive, hands-on learning environment for understanding how Node.js and V8 optimize JavaScript
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link
          href="/docs"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">📚 Documentation</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Learn about V8 optimization, deoptimization patterns, and performance best practices
          </p>
        </Link>

        <Link
          href="/experiments"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">🧪 Experiments</h2>
          <p className="text-gray-600 dark:text-gray-400">
            20+ runnable experiments demonstrating optimization patterns and common pitfalls
          </p>
        </Link>

        <Link
          href="/runs"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">📊 Run History</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View past experiment runs, compare results, and analyze performance data
          </p>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">🎯 What You'll Learn</h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• How V8's JIT compiler optimizes your code</li>
          <li>• How to detect deoptimizations using V8 tracing flags</li>
          <li>• Common deopt triggers: shape instability, polymorphism, type confusion</li>
          <li>• Practical patterns for writing optimization-friendly code</li>
          <li>• Node.js-specific performance considerations</li>
        </ul>
      </div>
    </div>
  )
}
