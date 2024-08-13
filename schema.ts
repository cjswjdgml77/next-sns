import {
  boolean,
  timestamp,
  pgTable,
  text,
  varchar,
  primaryKey,
  integer,
  smallint,
  real,
} from "drizzle-orm/pg-core";
import postgres from "postgres";
import { PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import {
  VercelPgDatabase,
  drizzle as drizzleVercel,
} from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";

import type { AdapterAccountType } from "next-auth/adapters";

const connectionString = process.env.POSTGRES_URL!;
const pool = postgres(connectionString, { max: 1 });
let db:
  | PostgresJsDatabase<Record<string, never>>
  | VercelPgDatabase<Record<string, never>>;
if (process.env.NODE_ENV !== "production") {
  db = drizzle(pool);
} else {
  db = drizzleVercel(sql);
}
export { db };
// export const db = drizzle(pool);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  isActive: boolean("isActive"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verficationToken) => ({
    compositePk: primaryKey({
      columns: [verficationToken.identifier, verficationToken.token],
    }),
  })
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => ({
    compositePK: primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  })
);

export const usersToChatrooms = pgTable("userToChatroom", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id),
  chatroomId: varchar("chatroomId", { length: 50 })
    .notNull()
    .references(() => chatrooms.id),
  unread: smallint("unread").default(0),
  name: varchar("name", { length: 15 }),
  isGroup: boolean("isGroup").$default(() => false),
  isActive: boolean("isActive").$default(() => false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const chatrooms = pgTable("chatroom", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  lastMessage: varchar("lastMessage", { length: 20 }),
  lastMessageTime: timestamp("lastMessageTime", { withTimezone: true }),
  createdAt: timestamp("createdAt").defaultNow(),
});
export const chats = pgTable("chat", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  message: text("message"),
  sender: varchar("sender", { length: 25 }),
  createdAt: timestamp("createdAt").defaultNow(),
  chatroomId: varchar("chatroomId", { length: 50 })
    .notNull()
    .references(() => chatrooms.id, { onDelete: "cascade" }),
});

export const chatImages = pgTable("chatImage", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 255 }).notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  chatId: varchar("chatId", { length: 50 })
    .notNull()
    .references(() => chats.id, {
      onDelete: "cascade",
    }),
});
