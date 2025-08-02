// FILE: components/TypewriterStream.tsx (No changes needed, just for context)

import React from 'react';
import { Markdown } from './markdown'; // Ensure this path is correct
import { useTypewriter } from '@/hooks/useTypewriter';

interface TypewriterStreamProps {
  fullText: string;
  onComplete: () => void;
  isStopped: boolean;
  speed?: number;
  chunkSize?: number;
}

const TypewriterStream: React.FC<TypewriterStreamProps> = ({
  fullText,
  onComplete,
  isStopped,
  speed,
  chunkSize,
}) => {
  const displayText = useTypewriter({
    fullText,
    onComplete,
    isStopped,
    speed,
    chunkSize,
  });

  return (
    // Pass the displayText to Markdown, and tell it to animate characters
    <Markdown animateChars={true}>
      {displayText}
    </Markdown>
  );
};

export default TypewriterStream;