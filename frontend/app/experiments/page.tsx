import Link from 'next/link'

interface Experiment {
  id: string
  slug: string
  name: string
  description: string
  variants: string[]
  tags: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

async function getExperiments(): Promise<Experiment[]> {
  const res = await fetch('http://localhost:4000/api/experiments', {
    cache: 'no-store'
  })
  if (!res.ok) return []
  return res.json()
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default async function ExperimentsPage() {
  const experiments = await getExperiments()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Experiments
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {experiments.length} runnable experiments demonstrating V8 optimization patterns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((exp) => (
          <Link
            key={exp.id}
            href={`/experiments/${exp.slug}`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {exp.name}
              </h2>
              {exp.difficulty && (
                <span className={`text-xs px-2 py-1 rounded ${difficultyColors[exp.difficulty]}`}>
                  {exp.difficulty}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
              {exp.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {exp.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500">
              {exp.variants.length} variants available
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
