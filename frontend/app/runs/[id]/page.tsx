import Link from 'next/link'
import LiveLogViewer from '@/components/LiveLogViewer'

interface Run {
  id: string
  experiment: string
  variant: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  options: {
    trace: boolean
    profile: boolean
    warmup: number
    repeat: number
  }
  timestamps: {
    queued: string
    started?: string
    completed?: string
  }
  environment: {
    nodeVersion: string
    v8Version: string
    platform: string
  }
  results?: {
    exitCode: number
    durationMs: number
  }
}

async function getRun(id: string): Promise<Run | null> {
  try {
    const res = await fetch(`http://localhost:4000/api/runs/${id}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    return null
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString()
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const run = await getRun(id)

  if (!run) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Run not found
          </h1>
          <Link
            href="/runs"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to runs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/runs"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to runs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {run.experiment} - {run.variant}
        </h1>
      </div>

      {/* Run details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Configuration
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Variant:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{run.variant}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Trace:</dt>
              <dd className="text-gray-900 dark:text-white">{run.options.trace ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Profile:</dt>
              <dd className="text-gray-900 dark:text-white">{run.options.profile ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Warmup:</dt>
              <dd className="text-gray-900 dark:text-white">{run.options.warmup.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Repeat:</dt>
              <dd className="text-gray-900 dark:text-white">{run.options.repeat.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Results
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Queued:</dt>
              <dd className="text-gray-900 dark:text-white">{formatDate(run.timestamps.queued)}</dd>
            </div>
            {run.timestamps.started && (
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Started:</dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(run.timestamps.started)}</dd>
              </div>
            )}
            {run.timestamps.completed && (
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Completed:</dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(run.timestamps.completed)}</dd>
              </div>
            )}
            {run.results && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Duration:</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {(run.results.durationMs / 1000).toFixed(2)}s
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Exit code:</dt>
                  <dd className="text-gray-900 dark:text-white">{run.results.exitCode}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Node:</dt>
              <dd className="text-gray-900 dark:text-white text-xs">{run.environment.nodeVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">V8:</dt>
              <dd className="text-gray-900 dark:text-white text-xs">{run.environment.v8Version}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Live log viewer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Output
        </h2>
        <LiveLogViewer runId={run.id} initialStatus={run.status} />
      </div>
    </div>
  )
}
