import { chatImages, chats, users, usersToChatrooms } from "@/schema";
import { InferSelectModel } from "drizzle-orm";

export interface IUser extends InferSelectModel<typeof users> {}
export interface IUserToChatroom
  extends InferSelectModel<typeof usersToChatrooms> {}

export interface IMessages extends InferSelectModel<typeof chats> {}
export interface IMessageImages extends InferSelectModel<typeof chatImages> {}

export interface IMessagesWithIUsers {
  chat: IMessages | null;
  user: IUser | null;
  images: IMessageImages[] | [];
}
