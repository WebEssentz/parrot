// FILE: app/api/articles/[articleId]/route.ts

import { db } from "@/lib/db";
import { article as articleTable, user as userTable } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server"; // Use NextResponse for cleaner responses
import { z } from "zod";

// --- NEW GET HANDLER ---
export async function GET(
  req: Request,
  { params }: { params: { articleId: string } }
) {
  try {
    const { userId } = await auth();
    const articleId = params.articleId;

    if (!articleId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    const [article] = await db
      .select()
      .from(articleTable)
      .where(eq(articleTable.id, articleId));

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Public articles can be viewed by anyone. Drafts can only be viewed by the author.
    if (article.status === 'draft' && article.authorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    return NextResponse.json(article, { status: 200 });

  } catch (error) {
    console.error("❌ [ARTICLE_GET_API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


// Your existing PATCH handler
const updateArticleSchema = z.object({
  title: z.string().min(3).optional(),
  content_md: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { articleId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const articleId = params.articleId;
    const body = await req.json();
    const validated = updateArticleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }

    const [updatedArticle] = await db
      .update(articleTable)
      .set({
        ...validated.data,
        updatedAt: new Date(),
      })
      .where(and(eq(articleTable.id, articleId), eq(articleTable.authorId, userId)))
      .returning();

    if (!updatedArticle) {
      return NextResponse.json({ error: "Article not found or you do not have permission to edit." }, { status: 404 });
    }

    return NextResponse.json(updatedArticle, { status: 200 });
  } catch (error) {
    console.error("❌ [ARTICLE_PATCH_API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}