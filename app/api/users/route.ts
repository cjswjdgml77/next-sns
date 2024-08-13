import { auth } from "@/auth";
import { db, users } from "@/schema";
import { and, eq, ilike, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const session = await auth();
  if (!session) return NextResponse.json("Unauthorized", { status: 401 });
  if (name) {
    try {
      const data = await db
        .select()
        .from(users)
        .where(
          and(
            ilike(users.name, `%${name}%`),
            ne(users.email, session.user?.email!)
          )
        );
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json("Internal Server Error", { status: 500 });
    }
  }
}
