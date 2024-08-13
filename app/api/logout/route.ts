import { auth } from "@/auth";
import { db, users } from "@/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("in");
  const session = await auth();
  if (!session) return NextResponse.json("Unauthenticated", { status: 401 });
  await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.email, session.user?.email!));
  return NextResponse.json("Success");
}
