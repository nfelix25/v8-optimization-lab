'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RunFormProps {
  experimentSlug: string
  variants: string[]
}

export default function RunForm({ experimentSlug, variants }: RunFormProps) {
  const router = useRouter()
  const [variant, setVariant] = useState(variants[0] || 'baseline')
  const [trace, setTrace] = useState(false)
  const [profile, setProfile] = useState(false)
  const [warmup, setWarmup] = useState(1000)
  const [repeat, setRepeat] = useState(100000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exp: experimentSlug,
          variant,
          trace,
          profile,
          warmup,
          repeat,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create run')
      }

      const data = await res.json()
      router.push(`/runs/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Variant
        </label>
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        >
          {variants.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trace}
              onChange={(e) => setTrace(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Enable trace (--trace-opt, --trace-deopt)
            </span>
          </label>
        </div>

        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profile}
              onChange={(e) => setProfile(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Enable CPU profiling (--cpu-prof)
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Warmup iterations
          </label>
          <input
            type="number"
            value={warmup}
            onChange={(e) => setWarmup(parseInt(e.target.value))}
            min="0"
            max="100000"
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Repeat iterations
          </label>
          <input
            type="number"
            value={repeat}
            onChange={(e) => setRepeat(parseInt(e.target.value))}
            min="1"
            max="1000000"
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {loading ? 'Starting experiment...' : 'Run Experiment'}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
        CLI equivalent: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          npm run exp -- --exp {experimentSlug} --variant {variant}
          {trace ? ' --trace on' : ''}
          {profile ? ' --profile on' : ''}
          {warmup !== 1000 ? ` --warmup ${warmup}` : ''}
          {repeat !== 100000 ? ` --repeat ${repeat}` : ''}
        </code>
      </p>
    </form>
  )
}
