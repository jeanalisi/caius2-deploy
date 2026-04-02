import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  _io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  _io.on("connection", (socket) => {
    socket.on("join_user", (userId: number) => {
      socket.join(`user:${userId}`);
    });
    socket.on("join_conversation", (conversationId: number) => {
      socket.join(`conv:${conversationId}`);
    });
    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conv:${conversationId}`);
    });
  });

  return _io;
}

export function getIo(): SocketIOServer | null {
  return _io;
}
