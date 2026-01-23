import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config.js';
import { ExperimentMetadata } from '../types.js';

export class ExperimentsService {
  private cache: Map<string, ExperimentMetadata> = new Map();

  async listExperiments(): Promise<ExperimentMetadata[]> {
    const dirs = await readdir(CONFIG.experimentsDir, { withFileTypes: true });
    const expDirs = dirs.filter(d => d.isDirectory() && !d.name.startsWith('_'));

    const experiments: ExperimentMetadata[] = [];

    for (const dir of expDirs) {
      const slug = dir.name;
      let exp = this.cache.get(slug);

      if (!exp) {
        exp = await this.parseExperiment(slug);
        if (exp) {
          this.cache.set(slug, exp);
        }
      }

      if (exp) {
        experiments.push(exp);
      }
    }

    return experiments.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getExperiment(slug: string): Promise<{ metadata: ExperimentMetadata; readme: string } | null> {
    const expDir = join(CONFIG.experimentsDir, slug);
    const readmePath = join(expDir, 'README.md');

    try {
      await access(readmePath);
      const metadata = await this.parseExperiment(slug);
      if (!metadata) return null;

      const readme = await readFile(readmePath, 'utf-8');
      return { metadata, readme };
    } catch (error) {
      return null;
    }
  }

  private async parseExperiment(slug: string): Promise<ExperimentMetadata | null> {
    const expDir = join(CONFIG.experimentsDir, slug);
    const readmePath = join(expDir, 'README.md');

    try {
      const content = await readFile(readmePath, 'utf-8');
      const { data } = matter(content);

      // Detect available variants
      const variants: string[] = [];
      for (const variant of ['baseline', 'deopt', 'fixed']) {
        try {
          await access(join(expDir, `${variant}.js`));
          variants.push(variant);
        } catch {}
      }

      // Extract tags from folder name
      const tags = this.extractTags(slug);

      // Determine difficulty from folder number
      const difficulty = this.determineDifficulty(slug);

      return {
        id: slug,
        slug,
        name: data.title || this.titleFromSlug(slug),
        description: data.description || data.purpose || 'V8 optimization experiment',
        variants,
        tags,
        difficulty,
        readmePath: 'README.md',
      };
    } catch (error) {
      return null;
    }
  }

  private titleFromSlug(slug: string): string {
    return slug
      .replace(/^\d+-/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractTags(slug: string): string[] {
    const tagMap: Record<string, string[]> = {
      'hidden-classes': ['shapes', 'optimization'],
      'inline-caches': ['IC', 'optimization'],
      'elements-kinds': ['arrays', 'optimization'],
      'polymorphism': ['IC', 'deoptimization'],
      'try-catch': ['bailout', 'optimization'],
      'gc': ['memory', 'garbage-collection'],
      'async': ['promises', 'microtasks'],
      'buffer': ['Node.js', 'TypedArray'],
      'string': ['strings', 'optimization'],
      'json': ['parsing', 'shapes'],
    };

    const tags: string[] = [];
    for (const [key, values] of Object.entries(tagMap)) {
      if (slug.includes(key)) {
        tags.push(...values);
      }
    }

    return tags.length > 0 ? tags : ['optimization'];
  }

  private determineDifficulty(slug: string): 'beginner' | 'intermediate' | 'advanced' {
    const num = parseInt(slug.split('-')[0], 10);
    if (num <= 7) return 'beginner';
    if (num <= 14) return 'intermediate';
    return 'advanced';
  }
}
