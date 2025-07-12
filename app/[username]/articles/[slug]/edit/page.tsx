// FILE: app/[username]/articles/[slug]/edit/page.tsx

import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"
import { article as articleTable } from "@/lib/db/schema"
import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { MonochromaticEditor } from "@/components/canvas/signature-canvas-editor"

// --- UPDATED FUNCTION ---
async function getArticleForEdit(authorName: string, slug: string, userId: string) {
  // Renamed 'username' to 'authorName' for clarity
  console.log(`🔍 [EDIT PAGE] Looking for article: authorName=${authorName}, slug=${slug}, userId=${userId}`)

  const articleData = await db.query.article.findFirst({
    where: and(eq(articleTable.slug, slug), eq(articleTable.authorId, userId)),
    with: {
      author: {
        columns: {
          // --- CHANGE 1: Fetch firstName instead of username ---
          firstName: true,
        },
      },
    },
  })

  console.log(`📄 [EDIT PAGE] Article found:`, articleData ? "Yes" : "No")

  // --- CHANGE 2: Compare against firstName (case-insensitively for safety) ---
  if (articleData?.author?.firstName?.toLowerCase() !== authorName.toLowerCase()) {
    console.log(`❌ [EDIT PAGE] Author name mismatch: URL=${authorName}, Author DB=${articleData?.author?.firstName}`)
    return null
  }

  return articleData
}

interface PageProps {
  params: {
    // The folder is named [username], but we know it's the first name
    username: string 
    slug: string
  }
}

export default async function ArticleEditPage({ params }: PageProps) {
  // For clarity, we'll assign the param to a variable named 'firstName'
  const { username: firstName, slug } = params;
  console.log(`🚀 [EDIT PAGE] Accessing edit page for author:`, firstName)

  const { userId } = await auth()
  if (!userId) {
    console.log(`❌ [EDIT PAGE] No user ID found`)
    return notFound()
  }

  // Pass the firstName to our updated function
  const article = await getArticleForEdit(firstName, slug, userId)
  if (!article) {
    console.log(`❌ [EDIT PAGE] Article not found or access denied`)
    return notFound()
  }

  console.log(`✅ [EDIT PAGE] Article loaded successfully:`, article.title)

  return <MonochromaticEditor initialArticle={article} />
}