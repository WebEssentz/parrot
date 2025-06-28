// components/github-workflow-aggregator.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, GitPullRequest, GitCommit, GitBranch, File, List, ShieldCheck, Bug, GitFork, Loader2 } from 'lucide-react';
import { SiGithub } from 'react-icons/si';

// This object maps the action string to a specific icon from lucide-react.
const actionIcons = {
  listFiles: List,
  readFile: File,
  createBranch: GitBranch,
  createOrUpdateFile: GitCommit,
  createPullRequest: GitPullRequest,
  getCommitStatus: ShieldCheck,
  createIssue: Bug,
  updateWorkflow: ShieldCheck,
  default: AlertCircle,
  fork: GitFork
};

const getStatusInfo = (isComplete: boolean, hasError: boolean) => {
  if (hasError) return { Icon: AlertCircle, color: 'text-red-500' };
  if (isComplete) return { Icon: Check, color: 'text-green-500' };
  return { Icon: Loader2, color: 'text-zinc-500' }; // No spin here, we'll apply it conditionally
};

// --- THIS COMPONENT IS UPDATED ---
const WorkflowStep = ({ step, index, completedSteps }: { step: any, index: number, completedSteps: number }) => {
  const isComplete = index < completedSteps;
  const isInProgress = index === completedSteps;
  const { Icon: StatusIcon, color } = getStatusInfo(isComplete, false); // Get the status icon (Check, Hourglass, etc.)
  
  // --- THE FIX: Use the actionIcons map to get the correct icon for the specific action ---
  const ActionIcon = actionIcons[step.action as keyof typeof actionIcons] || actionIcons.default;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center justify-center w-5 h-5">
        <StatusIcon className={`size-4 flex-shrink-0 ${color} ${isInProgress ? 'animate-spin' : ''}`} />
      </div>
      {/* --- THE FIX: Render the ActionIcon next to the action name --- */}
      <div className="flex items-center gap-2 font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
        <ActionIcon className="size-3 text-zinc-500" />
        <span>{step?.action}</span>
      </div>
      <span className="text-zinc-500 dark:text-zinc-400 truncate">
        {step?.params?.path || step?.params?.newBranchName || step?.params?.title || ''}
      </span>
    </div>
  );
};
// --- END OF UPDATED COMPONENT ---


export function GithubWorkflowAggregator({ invocations }: { invocations: any[] }) {
  if (!invocations || invocations.length === 0) return null;

  const { owner, repo, workflow } = invocations[0].toolInvocation.args;
  const result = invocations[0].toolInvocation.result;
  // Handle the case where the workflow is in progress and `result` might not exist yet.
  const completedSteps = result?.completedSteps?.length || 0;
  const hasError = result?.status === 'failed';

  return (
    <motion.div
      className="my-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="border border-zinc-200/80 dark:border-zinc-700/60 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SiGithub className="size-4 text-zinc-500" />
            <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
              GitHub Agent on <code className="text-sm">{owner}/{repo}</code>
            </h4>
          </div>
          <span className={`text-xs ${hasError ? 'text-red-500' : 'text-zinc-500'}`}>
            {hasError ? 'Failed' : `${completedSteps} / ${workflow.length} complete`}
          </span>
        </div>
        <div className="flex flex-col gap-2 pl-1">
          {workflow.map((step: any, index: number) => (
            <WorkflowStep key={index} step={step} index={index} completedSteps={completedSteps} />
          ))}
        </div>
        {hasError && (
            <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
                <strong>Error:</strong> {result.error}
            </div>
        )}
      </div>
    </motion.div>
  );
}