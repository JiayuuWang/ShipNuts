import { query } from '@anthropic-ai/claude-agent-sdk';

export interface AgentRunOptions {
  prompt: string;
  cwd?: string;
  model?: string;
  maxTurns?: number;
  timeout?: number;
  allowedTools?: string[];
}

export interface AgentResult {
  success: boolean;
  result: string;
  error?: string;
  durationMs?: number;
  costUsd?: number;
}

/**
 * Run a Claude Code agent with the given prompt and options.
 * Returns the final text result or error.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentResult> {
  const {
    prompt,
    cwd = process.cwd(),
    model = 'claude-sonnet-4-6',
    maxTurns = 20,
    timeout = 600000,
    allowedTools = ['WebSearch', 'WebFetch', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
  } = options;

  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), timeout);

  try {
    const conversation = query({
      prompt,
      options: {
        cwd,
        model,
        maxTurns,
        abortController,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        allowedTools,
        persistSession: false,
      },
    });

    let finalResult: AgentResult = {
      success: false,
      result: '',
      error: 'No result received',
    };

    for await (const message of conversation) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResult = {
            success: true,
            result: message.result,
            durationMs: message.duration_ms,
            costUsd: message.total_cost_usd,
          };
        } else {
          finalResult = {
            success: false,
            result: '',
            error: `Agent error: ${message.subtype}`,
            durationMs: message.duration_ms,
            costUsd: message.total_cost_usd,
          };
        }
      }
    }

    return finalResult;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, result: '', error: 'Agent timed out' };
    }
    return { success: false, result: '', error: error.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a Claude Code agent that returns structured JSON output.
 * Parses the result as JSON of type T.
 */
export async function runAgentJSON<T>(options: AgentRunOptions): Promise<{ success: boolean; data?: T; error?: string }> {
  const result = await runAgent(options);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    // Extract JSON from the result - it may be wrapped in markdown code blocks
    let jsonStr = result.result;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    // Also try to find raw JSON array or object
    const rawMatch = jsonStr.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (rawMatch) {
      jsonStr = rawMatch[1];
    }
    const data = JSON.parse(jsonStr) as T;
    return { success: true, data };
  } catch (parseError: any) {
    return { success: false, error: `Failed to parse agent output as JSON: ${parseError.message}` };
  }
}
