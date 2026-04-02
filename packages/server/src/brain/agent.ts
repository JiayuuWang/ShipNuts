import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AgentOutputType } from '@shipnuts/shared';

export interface AgentStreamMessage {
  type: AgentOutputType;
  content: string;
  toolName?: string;
}

export interface AgentRunOptions {
  prompt: string;
  cwd?: string;
  model?: string;
  maxTurns?: number;
  timeout?: number;
  allowedTools?: string[];
  onMessage?: (msg: AgentStreamMessage) => void;
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
 * Streams intermediate events via onMessage callback.
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentResult> {
  const {
    prompt,
    cwd = process.cwd(),
    model = 'claude-sonnet-4-6',
    maxTurns = 20,
    timeout = 600000,
    allowedTools = ['WebSearch', 'WebFetch', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
    onMessage,
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

    onMessage?.({ type: 'init', content: `Agent started (model: ${model}, maxTurns: ${maxTurns})` });

    for await (const message of conversation) {
      if (message.type === 'assistant') {
        // Extract text from assistant message content blocks
        const textBlocks = message.message.content.filter(
          (b: any) => b.type === 'text'
        );
        for (const block of textBlocks) {
          onMessage?.({ type: 'text', content: (block as any).text });
        }
      } else if (message.type === 'tool_use_summary') {
        onMessage?.({ type: 'tool_use', content: message.summary });
      } else if (message.type === 'tool_progress') {
        onMessage?.({
          type: 'progress',
          content: `Tool running: ${message.tool_name} (${Math.round(message.elapsed_time_seconds)}s)`,
          toolName: message.tool_name,
        });
      } else if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalResult = {
            success: true,
            result: message.result,
            durationMs: message.duration_ms,
            costUsd: message.total_cost_usd,
          };
          onMessage?.({
            type: 'result',
            content: `Completed in ${Math.round(message.duration_ms / 1000)}s ($${message.total_cost_usd.toFixed(4)})`,
          });
        } else {
          finalResult = {
            success: false,
            result: '',
            error: `Agent error: ${message.subtype}`,
            durationMs: message.duration_ms,
            costUsd: message.total_cost_usd,
          };
          onMessage?.({
            type: 'error',
            content: `Agent failed: ${message.subtype}`,
          });
        }
      }
    }

    return finalResult;
  } catch (error: any) {
    const errMsg = error.name === 'AbortError' ? 'Agent timed out' : (error.message || String(error));
    onMessage?.({ type: 'error', content: errMsg });
    return { success: false, result: '', error: errMsg };
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
    const rawMatch = jsonStr.match(/([\[\{][\s\S]*[\]\}])/);
    if (rawMatch) {
      jsonStr = rawMatch[1];
    }
    const data = JSON.parse(jsonStr) as T;
    return { success: true, data };
  } catch (parseError: any) {
    return { success: false, error: `Failed to parse agent output as JSON: ${parseError.message}` };
  }
}
