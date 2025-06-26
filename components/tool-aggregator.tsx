// components/tool-aggregator.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Link as LinkIcon, Check, Hourglass, AlertCircle } from 'lucide-react';

const toolIcons = {
  exaSearchTool: Search,
  fetchUrlTool: LinkIcon,
  default: AlertCircle,
};

// A single item in the aggregated list (e.g., one search query)
const AggregatedItem = ({ text, status }: { text: string, status: 'complete' | 'in-progress' | 'error' }) => {
  const Icon = status === 'complete' ? Check : status === 'in-progress' ? Hourglass : AlertCircle;
  const color = status === 'complete' ? 'text-green-500' : status === 'in-progress' ? 'text-blue-500' : 'text-red-500';
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={`size-4 flex-shrink-0 ${color} ${status === 'in-progress' ? 'animate-spin' : ''}`} />
      <span className="text-zinc-600 dark:text-zinc-400 truncate">{text}</span>
    </div>
  );
};

export function ToolInvocationAggregator({ toolInvocations }: { toolInvocations: any[] }) {
  if (!toolInvocations || toolInvocations.length === 0) return null;

  // --- AGGREGATION LOGIC ---
  const aggregated: Record<string, { calls: any[], completed: number }> = {};

  toolInvocations.forEach(part => {
    const { toolName, state, args } = part.toolInvocation;
    if (!aggregated[toolName]) {
      aggregated[toolName] = { calls: [], completed: 0 };
    }
    
    // For batched searches, un-pack the queries array
    if (toolName === 'exaSearchTool' && args.queries && Array.isArray(args.queries)) {
      args.queries.forEach((q: string) => {
        aggregated[toolName].calls.push({ text: q, status: state === 'result' ? 'complete' : 'in-progress' });
      });
    } else { // For single calls like fetchUrl
      const text = args.query || args.url || toolName;
      aggregated[toolName].calls.push({ text, status: state === 'result' ? 'complete' : 'in-progress' });
    }

    if (state === 'result') {
      aggregated[toolName].completed += (args.queries ? args.queries.length : 1);
    }
  });

  return (
    <motion.div
      className="my-4 flex flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {Object.entries(aggregated).map(([toolName, data]) => {
        const ToolIcon = toolIcons[toolName as keyof typeof toolIcons] || toolIcons.default;
        const totalCalls = data.calls.length;
        const completedCalls = data.calls.filter(c => c.status === 'complete').length;

        return (
          <div key={toolName} className="border border-zinc-200/80 dark:border-zinc-700/60 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ToolIcon className="size-4 text-zinc-500" />
                <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                  {toolName === 'exaSearchTool' ? 'Researching' : `Using ${toolName}`}
                </h4>
              </div>
              <span className="text-xs text-zinc-500">
                {completedCalls} / {totalCalls} complete
              </span>
            </div>
            <div className="flex flex-col gap-1 pl-6">
              {data.calls.map((call, index) => (
                <AggregatedItem key={index} text={call.text} status={call.status} />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}