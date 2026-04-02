import { runAgentJSON } from './agent.js';
import type { AgentStreamMessage } from './agent.js';
import type { RawIdea } from '@shipnuts/shared';

export interface MineOptions {
  sources: string[];
  maxIdeas: number;
  timeWindow: '24h' | '48h' | '7d';
  timeout?: number;
  onMessage?: (source: string, msg: AgentStreamMessage) => void;
}

/**
 * Mine ideas from configured data sources using Claude Code.
 */
export async function mineIdeas(options: MineOptions): Promise<RawIdea[]> {
  const { sources, maxIdeas, timeWindow, timeout = 300000, onMessage } = options;

  const allIdeas: RawIdea[] = [];

  // Run mining for each source concurrently
  const promises = sources.map((source) => mineFromSource(source, maxIdeas, timeWindow, timeout, onMessage));
  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      allIdeas.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error('Mining failed for a source:', result.reason);
    }
  }

  return allIdeas.slice(0, maxIdeas);
}

async function mineFromSource(
  source: string,
  maxIdeas: number,
  timeWindow: string,
  timeout: number,
  onMessage?: (source: string, msg: AgentStreamMessage) => void,
): Promise<RawIdea[]> {
  const prompt = buildMiningPrompt(source, maxIdeas, timeWindow);

  const result = await runAgentJSON<RawIdea[]>({
    prompt,
    maxTurns: 15,
    timeout,
    allowedTools: ['WebSearch', 'WebFetch', 'Bash'],
    onMessage: onMessage ? (msg) => onMessage(source, msg) : undefined,
  });

  if (!result.success || !result.data) {
    console.error(`Mining from ${source} failed:`, result.error);
    return [];
  }

  // Tag each idea with its source
  return result.data.map((idea) => ({
    ...idea,
    source: source,
  }));
}

function buildMiningPrompt(source: string, maxIdeas: number, timeWindow: string): string {
  const sourceInstructions: Record<string, string> = {
    'hackernews': `Search Hacker News (https://news.ycombinator.com) for recent Show HN posts and trending discussions about new tools, libraries, and project ideas from the last ${timeWindow}. Use the HN API (https://hacker-news.firebaseio.com/v0/) or web search to find them.`,

    'github-trending': `Search GitHub Trending repositories (https://github.com/trending) for new and interesting projects that just appeared in the last ${timeWindow}. Focus on projects with novel ideas that could inspire new open source tools. Use web search or the GitHub API.`,

    'reddit': `Search Reddit communities (r/SideProject, r/indiehackers, r/startups, r/programming) for recent posts about project ideas, tool requests, or pain points developers are facing in the last ${timeWindow}. Use web search to find them.`,

    'producthunt': `Search Product Hunt (https://www.producthunt.com) for recently launched products in the last ${timeWindow}. Focus on developer tools, productivity apps, and open-source projects. Use web search.`,

    'rss': `Search for recent tech blog posts and articles about emerging tools, libraries, and developer pain points from the last ${timeWindow}. Look at sources like dev.to, Hacker Noon, and popular tech blogs. Use web search.`,
  };

  const instructions = sourceInstructions[source] || `Search the web for recent project ideas and trends from "${source}" in the last ${timeWindow}.`;

  return `You are an idea mining assistant. Your job is to find promising open-source project ideas.

${instructions}

Find up to ${maxIdeas} interesting project ideas. For each idea, extract:
- A clear, concise title
- A detailed description of what the project would do and what problem it solves
- The source name
- The URL where you found it

Filter criteria:
- Must be a concrete, buildable project idea (not just a discussion or opinion)
- Must have enough description to understand the concept (at least 2 sentences)
- Must be a novel idea or approach (not a clone of something well-known)
- Exclude job postings, hiring, fundraising, or self-promotion

Output ONLY a JSON array in this exact format:
[
  {
    "title": "Project Title",
    "description": "Detailed description of the project idea, the problem it solves, and potential approach",
    "source": "${source}",
    "sourceUrl": "https://..."
  }
]

Return ONLY the JSON array, no other text.`;
}
