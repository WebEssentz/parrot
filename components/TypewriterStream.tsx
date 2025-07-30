// FILE: components/TypewriterStream.tsx

import React from 'react';
import { Markdown } from './markdown';
import { useTypewriter } from '@/hooks/useTypewriter';

interface TypewriterStreamProps {
  fullText: string;
  onComplete: () => void;
  isStopped: boolean;
}

const TypewriterStream: React.FC<TypewriterStreamProps> = ({
  fullText,
  onComplete,
  isStopped,
}) => {
  // The hook now uses optimized default values for speed and chunking.
  // You can override them here if you want to fine-tune the effect.
  // e.g., useTypewriter({ ..., speed: 10, chunkSize: 5 })
  const displayText = useTypewriter({
    fullText,
    onComplete,
    isStopped,
  });

  return <Markdown>{displayText}</Markdown>;
};

export default TypewriterStream;