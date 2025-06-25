# Changelog

## 2025-06-17

### 🚀 Exa Pro Deep Research Integration — Record-Breaking Speed

- **Exa Pro Deep Research Tool:** Integrated Exa Pro as the new default for web research, replacing Google Search. Exa Pro delivers research-grade, multi-source, reasoned answers with direct citations, not just search results.
- **Streaming & Ultra-Fast:** Achieved a record-breaking 9.8 seconds for full deep research answers (measured end-to-end). No URL fails observed in testing.
- **Streaming Support:** Added streaming mode for Exa Pro, returning partial results in real time for the fastest possible answers.
- **Grounded, Up-to-Date, and Reliable:** Every claim is directly cited, with no hallucinated URLs. Exa Pro is more grounded and up-to-date than Google or ChatGPT search.
- **Note:** According to Exa’s developer, the standard Exa model is even faster than Exa Pro. Imagine the speed for pure search!

---

## 2025-06-12

### 🚀 Major Architectural Upgrade: The Semantic Web Agent

This release marks a fundamental shift from a chatbot to a true AI agent.

-   **Semantic Link Analysis:** Implemented a new "link brain" using a fast LLM (`gemma-3n-e4b-it`) to analyze the semantic meaning of navigation links before following them. This dramatically improves navigation accuracy and prevents the agent from following irrelevant links based on simple keyword matches.
-   **Robust Timeout & Performance Management:**
    -   Increased the global operation timeout to 45 seconds to allow for complex, multi-page tasks.
    -   Added a 15-second timeout for individual `fetch` requests to prevent getting stuck on a single slow page.
    -   The agent is now self-aware of the master timeout and will gracefully stop initiating new expensive operations if time is running low.
-   **Enhanced Modality Handling:** The agent now correctly infers the user's goal (e.g., `summary`, `image`, `video`) and adapts its process. For summarization tasks, it now focuses on text extraction and bypasses unnecessary media analysis, preventing timeouts on text-heavy pages.
-   **Strategic Model Upgrade:**
    -   Replaced `gemini-1.5-flash` with **`gemma-3n-e4b-it`** for fast, low-latency tasks like intent extraction and link analysis.
    -   Replaced `gemini-1.5-pro-vision` with **`gemma-3-27b-it`** for powerful, high-reasoning tasks like vision analysis and article summarization.
-   **Resilient Tool Pivoting:** The agent's controlling logic is now better at recognizing when one tool (like `fetchUrlTool`) fails to produce a result and can pivot to an alternative (like `googleSearchTool`) to achieve the user's goal.

---

# 2025-05-26

### Features & Improvements

- **Agent X Recursive Web Agent & Deep Web Analysis:**
  - Added Agent X: a human-like, vision-guided web agent that can interact with dynamic sites (Amazon, YouTube, etc.) using Puppeteer and Gemini Vision.
  - **Recursive Link Following:** The fetchUrlTool now supports recursive link following with safeguards (recursionDepth, maxPages, timeout, domain restriction, visited tracking). This enables deep, automated exploration and extraction from multi-page sites.
  - **Progressive Disclosure:** Results are streamed stepwise, and users can request "show more" for deeper results.
  - **Token Counting & Truncation:** Large HTML is auto-truncated for LLM context safety, with user notification.
  - **Domain Restriction & Safety:** Only follows links within the same domain, with hard limits on recursion and total pages.
  - **Agent X Vision:** Uses Gemini Vision for screenshot and DOM analysis, enabling advanced extraction and reasoning on visual web content.

## 2025-05-20

### Features & Improvements

- **Mobile Safearea for Privacy Message:**
  - On mobile, the privacy policy message, textarea, and disclaimer are now wrapped in a "safearea". Tapping outside this area dismisses the privacy message, while taps inside do not.
  - This improves usability and prevents accidental dismissal when interacting with the input or privacy message.

---

## 2025-05-08

### Bug Fixes & Improvements

- **Chat Scroll Behavior:**
  - Improved auto-scroll logic in chat: the chat only auto-scrolls if the user is at the bottom or if the AI is not generating (not streaming/submitted).
  - If the user scrolls up during AI streaming, their scroll position is preserved and not overridden.
  - No forced scroll to bottom until AI is done or the user is already at the bottom, ensuring a user-friendly chat experience.

- **SSR/CSR Hydration Fix:**
  - Bar chart generator now uses deterministic number formatting (`toString()` instead of `toLocaleString`) to prevent hydration mismatches between server and client.

---

## 2025-05-05

### Major Updates

- **Search Mode Overhaul:**
  - Search mode is now a one-shot action: when the Search button is selected, the next message always uses real-time web search, then reverts to the default model. No more infinite search loops.
  - Search POSTs are always forced to use the search tool, regardless of the question, and the AI never relies on its training data for that message.
  - The system prompt and backend logic ensure the AI never mentions its training data, internal tools, or the ages of its creators unless specifically asked.

- **UI/UX Improvements:**
  - The header now displays "Avurna" in a modern, semibold font on desktop, and the original icon on mobile/tablet for a more branded look.
  - The search button's lit state is user-controlled and visually consistent.
  - The textarea input is now cleared automatically after sending a message for a smoother chat experience.

- **System Prompt & Privacy:**
  - Avurna will never mention the ages of its creators unless asked, but can answer accurately if prompted.
  - Avurna will never discuss its training data, datasets, or internal tool names. It describes its capabilities in plain language (e.g., "I can search Google").

- **Other:**
  - Improved code structure for model selection and POST handling to avoid race conditions and ensure correct model usage.
  - Responsive design improvements for both desktop and mobile.

---

See the README for setup and usage instructions.
