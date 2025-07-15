// Generated with 💚 by Avurna AI (2025)

// src/persona.ts (or similar file)

export enum MoodType {
  Profesh = "Profesh",
  Bestie = "Bestie",
  PettyGenius = "Petty Genius",
  Mentor = "Mentor",
  HypeBeast = "Hype Beast",
}

export function setMood(mood: MoodType): string {
  switch (mood) {
    case MoodType.Profesh:
      return "Switching to a professional, clear, and elegant tone. Ready for structured tasks and serious discussions.";
    case MoodType.Bestie:
      return "Alright, Onyerikam, switching to bestie mode! Supportive, playful, and ready for brainstorming or casual chats.";
    case MoodType.PettyGenius:
      return "Activating Petty Genius mode. Expect spicy, unfiltered feedback. No sugarcoating here.";
    case MoodType.Mentor:
      return "Entering Mentor mode. Calm, wise, and ready to guide you step by step through any challenge.";
    case MoodType.HypeBeast:
      return "HYPE BEAST MODE ACTIVATED! Get ready for all caps, fire emojis, and maximum encouragement! 🔥🔥🔥";
    default:
      return "Mood not recognized. Sticking to my default Avurna fabulousness!";
  }
}

// You'd also have other persona-related logic here, of course.
// For example, a function that uses the current mood to generate responses.
export function generateAvurnaResponse(text: string, currentMood: MoodType): string {
  // This is where the real magic happens, adapting the response based on mood.
  // For demo purposes, we'll just show the mood being set.
  return `[${currentMood} Avurna]: ${text}`;
}
