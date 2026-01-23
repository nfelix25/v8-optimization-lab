import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import Link from 'next/link'
import RunForm from '@/components/RunForm'
import 'highlight.js/styles/github-dark.css'

interface Experiment {
  metadata: {
    id: string
    slug: string
    name: string
    description: string
    variants: string[]
    tags: string[]
    difficulty?: string
  }
  readme: string
}

async function getExperiment(slug: string): Promise<Experiment | null> {
  try {
    const res = await fetch(`http://localhost:4000/api/experiments/${slug}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    return null
  }
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const experiment = await getExperiment(slug)

  if (!experiment) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Experiment not found
          </h1>
          <Link
            href="/experiments"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to experiments
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/experiments"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to experiments
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {experiment.metadata.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="markdown prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {experiment.readme}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Sidebar with run form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Run Experiment
            </h2>
            <RunForm
              experimentSlug={experiment.metadata.slug}
              variants={experiment.metadata.variants}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
