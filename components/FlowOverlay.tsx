"use client";

import React, { useState, useEffect } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// --- Define the AI's possible states ---
type AgentState = 'listening' | 'thinking' | 'speaking';

// --- Props Interface ---
export interface FlowOverlayProps {
  onClose: () => void;
  session: {
    room: Room;
    roomName: string;
  } | null;
  user: { id: string } | null | undefined; // We'll use this later
}

// --- The Data Bloom Visualizer Component ---
const DataBloomVisualizer = ({ state }: { state: AgentState }) => {
  const particleCount = 50;
  
  const bloomVariants = {
    listening: {
      scale: 1,
      rotate: 0,
      opacity: 0.6,
      transition: { type: 'spring', stiffness: 100, damping: 10 }
    },
    thinking: {
      scale: 1.2,
      rotate: 360,
      opacity: 1,
      transition: { type: 'tween', duration: 1.5, repeat: Infinity, ease: 'linear' }
    },
    speaking: {
      scale: [1, 1.1, 1, 1.1, 1],
      opacity: 1,
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  // This is a simplified particle implementation for demonstration
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const angle = (i / particleCount) * 2 * Math.PI;
    const radius = state === 'thinking' ? 80 + Math.random() * 40 : 100;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y, scale: Math.random() * 0.5 + 0.5 };
  });

  return (
    <motion.div
      className="relative w-64 h-64 flex items-center justify-center"
      variants={bloomVariants}
      animate={state}
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          style={{
            x: p.x,
            y: p.y,
            scale: p.scale,
          }}
        />
      ))}
    </motion.div>
  );
};


// --- The Main Overlay Component ---
export const FlowOverlay = ({ onClose, session }: FlowOverlayProps) => {
  const room = session?.room;
  const isConnecting = !session;

  // --- State to hold the agent's current activity ---
  const [agentState, setAgentState] = useState<AgentState>('listening');
  const [statusText, setStatusText] = useState('Connecting...');

  // --- Effect hook for listening to the agent ---
  useEffect(() => {
    if (!room) return;
    
    setStatusText('Listening...'); // Update status once connected

    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
        // We only care about data from our agent
        if (participant?.name !== 'Avurna') return;

        try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === 'agent_state' && msg.state) {
              setAgentState(msg.state);
              // Update status text based on state
              if (msg.state === 'thinking') setStatusText('Thinking...');
              if (msg.state === 'speaking') setStatusText('...'); // No text when speaking
              if (msg.state === 'listening') setStatusText('Listening...');
            }
        } catch(e) {
            console.error("Failed to parse agent data", e);
        }
    };

    // Listen for data packets
    room.on(RoomEvent.DataReceived, handleData);

    // Cleanup function to remove the listener
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]); // Rerun this effect if the room object changes

  return (
    <motion.div
      // --- UI REQUIREMENT: Overlay colors ---
      className="fixed inset-0 bg-white dark:bg-[#1C1C1C] flex flex-col items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {isConnecting ? (
          <p className="text-xl dark:text-white">Connecting to Flow...</p>
        ) : (
          <>
            <DataBloomVisualizer state={agentState} />
            <p className="mt-8 text-lg text-gray-500 dark:text-gray-400 h-8">
              {statusText}
            </p>
          </>
        )}
      </div>

      {/* Footer with End button */}
      <div className="w-full p-8 flex justify-center">
        <button
          onClick={onClose}
          className="bg-gray-200 dark:bg-gray-700 hover:bg-red-500/80 dark:hover:bg-red-500/80 text-gray-800 dark:text-gray-200 hover:text-white rounded-full p-4 transition-colors"
          aria-label="End Flow"
        >
          <X size={24} />
        </button>
      </div>
    </motion.div>
  );
};
