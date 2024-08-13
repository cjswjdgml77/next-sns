import { getPusherInstance } from "@/app/utils/realtime/pusher-server";
import { NextRequest } from "next/server";

const pusherServer = getPusherInstance();

export async function POST(request: NextRequest) {
  console.log("authenticating pusher perms...");
  const data = await request.text();
  const [socketId, channelName] = data
    .split("&")
    .map((str) => str.split("=")[1]);

  // logic to check user permissions

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);

  return new Response(JSON.stringify(authResponse));
}
