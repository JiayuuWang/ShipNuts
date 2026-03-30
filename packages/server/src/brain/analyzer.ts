import { runAgentJSON } from './agent.js';
import type { RawIdea, IdeaAnalysis } from '@shipnuts/shared';

export interface AnalyzeOptions {
  ideas: RawIdea[];
  criteria: {
    minGapScore: number;
    minValueScore: number;
    maxComplexity: 'low' | 'medium' | 'high';
  };
  timeout?: number;
}

export interface AnalyzedIdea extends RawIdea {
  analysis: IdeaAnalysis;
}

/**
 * Analyze a batch of raw ideas for gap, value, and feasibility.
 */
export async function analyzeIdeas(options: AnalyzeOptions): Promise<AnalyzedIdea[]> {
  const { ideas, criteria, timeout = 300000 } = options;

  // Analyze ideas concurrently (max 3 at a time to avoid rate limits)
  const results: AnalyzedIdea[] = [];
  const batchSize = 3;

  for (let i = 0; i < ideas.length; i += batchSize) {
    const batch = ideas.slice(i, i + batchSize);
    const promises = batch.map((idea) => analyzeOneIdea(idea, timeout));
    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const analyzed = result.value;
        // Apply user criteria filters
        if (passesFilter(analyzed.analysis, criteria)) {
          results.push(analyzed);
        }
      }
    }
  }

  // Sort by combined score (gap * 10 + value) descending
  results.sort((a, b) => {
    const scoreA = a.analysis.gap.gapScore * 10 + a.analysis.value.valueScore;
    const scoreB = b.analysis.gap.gapScore * 10 + b.analysis.value.valueScore;
    return scoreB - scoreA;
  });

  return results;
}

async function analyzeOneIdea(idea: RawIdea, timeout: number): Promise<AnalyzedIdea | null> {
  const prompt = buildAnalysisPrompt(idea);

  const result = await runAgentJSON<IdeaAnalysis>({
    prompt,
    maxTurns: 20,
    timeout,
    allowedTools: ['WebSearch', 'WebFetch', 'Bash'],
  });

  if (!result.success || !result.data) {
    console.error(`Analysis failed for "${idea.title}":`, result.error);
    return null;
  }

  return { ...idea, analysis: result.data };
}

function passesFilter(
  analysis: IdeaAnalysis,
  criteria: { minGapScore: number; minValueScore: number; maxComplexity: 'low' | 'medium' | 'high' }
): boolean {
  if (analysis.gap.gapScore < criteria.minGapScore) return false;
  if (analysis.value.valueScore < criteria.minValueScore) return false;

  const complexityRank = { low: 1, medium: 2, high: 3 };
  if (complexityRank[analysis.feasibility.complexity] > complexityRank[criteria.maxComplexity]) return false;

  return true;
}

function buildAnalysisPrompt(idea: RawIdea): string {
  return `You are a senior product analyst. Analyze the following project idea for market gap, value, and feasibility.

**Idea:** ${idea.title}
**Description:** ${idea.description}
**Source:** ${idea.source} (${idea.sourceUrl})

Please perform these steps:

1. **Gap Analysis**: Search GitHub for similar projects using web search. Search npm/PyPI for similar packages. Count how many direct competitors exist and assess differentiation potential.

2. **Value Assessment**: Identify who would use this, what pain point it solves, and its monetization potential.

3. **Feasibility Assessment**: Estimate technical complexity, development time, and recommend a tech stack.

Output ONLY a JSON object in this exact format:
{
  "gap": {
    "gapScore": <number 0-10, 10 = no competitors at all>,
    "gapAnalysis": "<detailed analysis of competitive landscape>",
    "similarProjects": ["<list of similar GitHub repos or tools found>"]
  },
  "value": {
    "valueScore": <number 0-100>,
    "targetUsers": "<description of target users>",
    "painPoint": "<the problem this solves>",
    "monetizationPotential": "<low|medium|high>"
  },
  "feasibility": {
    "complexity": "<low|medium|high>",
    "estimatedHours": <number>,
    "recommendedTechStack": ["<tech1>", "<tech2>"],
    "techStackViable": <true|false>
  }
}

Return ONLY the JSON object, no other text.`;
}
