
<h1 align="center">Avurna AI Chatbot</h1>

<p align="center">
  Avurna is an open-source, privacy-focused AI chatbot built with Next.js, the Vercel AI SDK, and Groq—customized for a modern, delightful, and transparent chat experience.

---

</p>


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
