<h1 align="center">Avurna AI Agent</h1>

<p align="center">
  Avurna is an open-source, AI-powered web agent built with Next.js and the Vercel AI SDK. It goes beyond a simple chatbot, using a multi-tool, recursive architecture to understand user goals, navigate the web, and synthesize information for you.
</p>

---

<p align="center">
  <a href="#-latest-major-update-the-semantic-web-agent"><strong>Latest Update</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy</strong></a> ·
  <a href="#running-locally"><strong>Run Locally</strong></a> ·
  <a href="#authors"><strong>Authors</strong></a>
</p>
<br/>

## 🚀 Latest Major Update: Exa Pro Deep Research (2025-06-17)

-   **Exa Pro Deep Research:** Avurna now uses Exa Pro for web research, providing research-grade, multi-source, reasoned answers with direct citations. This is a leap beyond traditional search—it's automated deep research.
-   **Record-Breaking Speed:** Achieved a new record: 9.8 seconds for a full deep research answer (measured end-to-end, streaming enabled). No URL fails in testing.
-   **Streaming Results:** Answers stream in real time for the fastest possible experience.
-   **More Grounded Than Google or ChatGPT:** Every claim is directly cited, with no hallucinated URLs. Exa Pro is more grounded and up-to-date than Google or ChatGPT search.
-   **Note:** The standard Exa model is even faster than Exa Pro for pure search.


-   **Semantic Navigation:** Avurna no longer just follows links; it uses a fast AI model to understand the *meaning* of links before navigating. This allows it to make human-like decisions, avoiding irrelevant rabbit holes and finding information more accurately.
-   **Multi-Modal Understanding:** Avurna can see images and watch videos on webpages using `gemma-3-27b-it` to analyze content, not just text.
-   **Recursive Web Exploration:** When information isn't on the first page, Avurna intelligently explores deeper, following the most promising paths to fulfill your request. This is all done with strict safety guards (domain-locking, page limits, timeouts).
-   **Task-Specific Processing:** Understands if you want a picture, a video, or a summary, and adapts its process to be as efficient as possible.
-   **Resilient & Transparent:** If one method fails (like direct page fetching), Avurna can pivot to another (like web search) and will explain its reasoning process to the user.

## Features

-   **Agentic Web Navigation:** A smart agent that can browse websites, understand content, and find answers for you.
-   **Multi-Modal Analysis:** Processes text, images, and video to get the full picture.
-   **Summarization Engine:** Can read long articles and provide concise, accurate summaries.
-   **Tool-Using Framework:** Seamlessly switches between browsing, searching, and analyzing to get the job done.
-   **Strategic Dual-Model AI Core:**
    -   Uses **`gemma-3n-e4b-it`** for lightning-fast tasks (like understanding your initial request).
    -   Uses **`gemma-3-27b-it`** for powerful, heavy-lifting tasks (like vision analysis and summarization).
-   **Modern, Responsive UI:** Built with [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com), and the [Next.js](https://nextjs.org) App Router.
-   **Streaming Responses:** Text and results stream in real-time, powered by the [Vercel AI SDK](https://sdk.vercel.ai/docs).


## 🚀 2025-05-20: Features & Improvements

- **Mobile Safearea for Privacy Message:**
  - On mobile, the privacy policy message, textarea, and disclaimer are now wrapped in a "safearea". Tapping outside this area dismisses the privacy message, while taps inside do not.
  - This improves usability and prevents accidental dismissal when interacting with the input or privacy message.

## 🚀 Major 2025 Updates

- **One-Shot Search Mode:** When the Search button is selected, the next message always uses real-time web search, then reverts to the default model. No more infinite search loops.
- **Privacy & Transparency:** Avurna never mentions its training data, internal tools, or the ages of its creators unless specifically asked. Capabilities are described in plain language (e.g., "I can search Google").
- **Modern UI:** The header now displays "Avurna" in a semibold, modern font on desktop, and the original icon on mobile/tablet. The search button's lit state is user-controlled and visually consistent. The textarea input is cleared after sending a message.
- **Robust Model Handling:** Improved code structure for model selection and POST handling to avoid race conditions and ensure correct model usage.
- **Responsive Design:** Enhanced experience for both desktop and mobile users.

See [CHANGELOG.md](./CHANGELOG.md) for details.

---

## ⚡️ 2025-06-17: Exa Pro Deep Research Integration

- Exa Pro is now the default for web research, replacing Google Search.
- Achieved a record-breaking 9.8 seconds for full deep research answers (streaming, no URL fails).
- Streaming mode returns partial results in real time.
- Every claim is directly cited, with no hallucinated URLs.
- Exa Pro is more grounded and up-to-date than Google or ChatGPT search.
- According to Exa’s developer, the standard Exa model is even faster than Exa Pro for pure search.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#authors"><strong>Authors</strong></a>
</p>
<br/>

## Features

- Real-time, one-shot search mode for up-to-date answers from the web
- Privacy-first: never reveals training data, internal tools, or creator details unless asked
- Modern, branded UI with responsive design and smooth chat experience
- Streaming text responses powered by the [AI SDK by Vercel](https://sdk.vercel.ai/docs), supporting multiple AI providers
- Built-in tool integration for extending AI capabilities (weather, web search, and more)
- Reasoning model support
- [shadcn/ui](https://ui.shadcn.com/) components for a modern, responsive UI powered by [Tailwind CSS](https://tailwindcss.com)
- Built with the latest [Next.js](https://nextjs.org) App Router

- **Agent X Web Agent:**
  - Human-like, vision-guided web agent for dynamic and interactive sites
  - Recursive link following with safeguards (recursionDepth, maxPages, timeout, domain restriction, visited tracking)
  - Gemini Vision-powered screenshot and DOM analysis
  - Progressive, stepwise results and deep web extraction

## Deploy Your Own

You can deploy your own version to Vercel by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=Vercel+x+Groq+Chatbot&repository-name=ai-sdk-starter-groq&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-starter-groq&demo-title=Vercel+x+Groq+Chatbot&demo-url=https%3A%2F%2Fai-sdk-starter-groq.labs.vercel.dev%2F&demo-description=A+simple+chatbot+application+built+with+Next.js+that+uses+Groq+via+the+AI+SDK+and+the+Vercel+Marketplace&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22api-key%22%2C%22integrationSlug%22%3A%22groq%22%7D%5D)

## Running Locally

1. Clone the repository and install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. Install the [Vercel CLI](https://vercel.com/docs/cli):

   ```bash
   npm i -g vercel
   # or
   yarn global add vercel
   # or
   pnpm install -g vercel
   ```

   Once installed, link your local project to your Vercel project:

   ```bash
   vercel link
   ```

   After linking, pull your environment variables:

   ```bash
   vercel env pull
   ```

   This will create a `.env.local` file with all the necessary environment variables.

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view your new AI chatbot application.

## Authors

Avurna AI is maintained by:

- Godwin (Lead Developer)
- Charles (UI/UX & Training)
- The open-source community

Contributions are welcome! Feel free to open issues or submit pull requests to enhance functionality or fix bugs.
