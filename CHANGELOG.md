# Changelog

## 2025-05-05

### Major Updates

- **Search Mode Overhaul:**
  - Search mode is now a one-shot action: when the Search button is selected, the next message always uses real-time web search, then reverts to the default model. No more infinite search loops.
  - Search POSTs are always forced to use the search tool, regardless of the question, and the AI never relies on its training data for that message.
  - The system prompt and backend logic ensure the AI never mentions its training data, internal tools, or the ages of its creators unless specifically asked.

- **UI/UX Improvements:**
  - The header now displays "Parrot" in a modern, semibold font on desktop, and the original icon on mobile/tablet for a more branded look.
  - The search button's lit state is user-controlled and visually consistent.
  - The textarea input is now cleared automatically after sending a message for a smoother chat experience.

- **System Prompt & Privacy:**
  - Parrot will never mention the ages of its creators unless asked, but can answer accurately if prompted.
  - Parrot will never discuss its training data, datasets, or internal tool names. It describes its capabilities in plain language (e.g., "I can search Google").

- **Other:**
  - Improved code structure for model selection and POST handling to avoid race conditions and ensure correct model usage.
  - Responsive design improvements for both desktop and mobile.

---

See the README for setup and usage instructions.
