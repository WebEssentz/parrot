// FILE: lib/read-data-stream.ts

// Enhanced stream reader with better AI SDK format handling
export async function* readDataStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          yield* processBuffer(buffer)
        }
        break
      }

      // Decode and add to buffer
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process complete lines from buffer
      const lines = buffer.split("\n")
      buffer = lines.pop() || "" // Keep incomplete line in buffer

      for (const line of lines) {
        yield* processLine(line)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function* processBuffer(buffer: string): Generator<string, void, unknown> {
  const lines = buffer.split("\n")
  for (const line of lines) {
    yield* processLine(line)
  }
}

function* processLine(line: string): Generator<string, void, unknown> {
  const trimmedLine = line.trim()
  if (!trimmedLine) return

  console.log(`[STREAM DEBUG] Processing line: "${trimmedLine.substring(0, 100)}..."`)

  try {
    // Handle AI SDK data stream format: "0:content" for text content
    if (trimmedLine.startsWith("0:")) {
      const jsonStr = trimmedLine.slice(2)
      if (!jsonStr.trim()) return

      try {
        const parsed = JSON.parse(jsonStr)
        console.log(`[STREAM DEBUG] Parsed object type:`, typeof parsed, parsed)

        // Handle different AI SDK response formats
        if (typeof parsed === "string") {
          console.log(`[STREAM DEBUG] Yielding string: "${parsed.substring(0, 50)}..."`)
          yield parsed
        } else if (parsed && typeof parsed === "object") {
          // Handle text delta format from AI SDK
          if (parsed.type === "text-delta" && parsed.textDelta) {
            console.log(`[STREAM DEBUG] Yielding text delta: "${parsed.textDelta.substring(0, 50)}..."`)
            yield parsed.textDelta
          }
          // Handle content field
          else if (parsed.content && typeof parsed.content === "string") {
            console.log(`[STREAM DEBUG] Yielding content: "${parsed.content.substring(0, 50)}..."`)
            yield parsed.content
          }
          // Handle text field
          else if (parsed.text && typeof parsed.text === "string") {
            console.log(`[STREAM DEBUG] Yielding text: "${parsed.text.substring(0, 50)}..."`)
            yield parsed.text
          }
          // Handle delta field
          else if (parsed.delta && typeof parsed.delta === "string") {
            console.log(`[STREAM DEBUG] Yielding delta: "${parsed.delta.substring(0, 50)}..."`)
            yield parsed.delta
          } else {
            console.log(`[STREAM DEBUG] Unhandled object format:`, Object.keys(parsed))
          }
        }
      } catch (parseError) {
        console.log(`[STREAM DEBUG] JSON parse failed, treating as plain text: "${jsonStr.substring(0, 50)}..."`)
        // If it's not JSON, treat as plain text (but filter out obvious metadata)
        if (!jsonStr.includes('"type":') && !jsonStr.includes('"usage":') && !jsonStr.includes('"model":')) {
          yield jsonStr
        }
      }
    }
    // Skip metadata lines (1:, 2:, 8:, 9:, etc.) but log them for debugging
    else if (/^\d+:/.test(trimmedLine)) {
      console.log(`[STREAM DEBUG] Skipping metadata line: ${trimmedLine.substring(0, 50)}...`)
      return
    }
    // Handle any other plain text lines
    else {
      console.log(`[STREAM DEBUG] Processing plain text line: "${trimmedLine.substring(0, 50)}..."`)
      // Only yield if it doesn't look like metadata
      if (!trimmedLine.includes('{"') && !trimmedLine.includes('"type":') && !trimmedLine.includes("data:")) {
        yield trimmedLine
      }
    }
  } catch (error) {
    console.warn("[STREAM DEBUG] Error processing line:", trimmedLine.substring(0, 100), error)
  }
}
