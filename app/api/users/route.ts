import { NextRequest, NextResponse } from "next/server";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

// GET /api/users?username=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  // Check if username exists
  const existing = await db.select().from(userTable).where(eq(userTable.username, username));
  return NextResponse.json({ exists: existing.length > 0 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API DEBUG] Received body:", body);

    if (!body.email || !body.username) {
      console.log("[API DEBUG] Missing required fields");
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const existing = await db.select().from(userTable).where(eq(userTable.username, body.username));
    if (existing.length > 0) {
      console.log("[API DEBUG] Username already exists");
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    const existingEmail = await db.select().from(userTable).where(eq(userTable.email, body.email));
    if (existingEmail.length > 0) {
      console.log("[API DEBUG] Email already exists");
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    // Log what you are about to insert
    const insertObj = {
      email: body.email,
      username: body.username,
      firstName: body.firstname || "",
      lastName: body.lastname || "",
      profilePic: body.profilePic || null,
      birthday: body.birthday
        ? (typeof body.birthday === "string"
            ? body.birthday.slice(0, 10)
            : new Date(body.birthday).toISOString().slice(0, 10))
        : null,
    };
    console.log("[API DEBUG] Inserting user:", insertObj);

    const newUser = await db.insert(userTable).values(insertObj).returning();
    console.log("[API DEBUG] Inserted user:", newUser);

    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (err) {
    console.log("[API DEBUG] Exception:", err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}