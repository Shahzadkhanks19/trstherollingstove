import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env, corsOrigins } from "./config/env.js";
import { connectToDatabase, disconnectFromDatabase } from "./db/mongoose.js";
import { authenticateSocket } from "./auth/authenticateSocket.js";
import { createHttpApp } from "./http/app.js";
import { registerSocketHandlers } from "./socket/registerHandlers.js";
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "./types/socket.js";

await connectToDatabase();
const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: { origin: corsOrigins, credentials: true }, transports: ["websocket", "polling"], pingInterval: 25_000, pingTimeout: 20_000,
  maxHttpBufferSize: 256 * 1024, connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: false }
});
io.use(authenticateSocket);
io.on("connection", (socket) => registerSocketHandlers(io, socket));
httpServer.on("request", createHttpApp(io));
httpServer.listen(env.PORT, env.HOST, () => console.log(`TRS realtime server listening on http://${env.HOST}:${env.PORT}`));
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return; shuttingDown = true; console.log(`${signal} received; shutting down realtime server`);
  io.disconnectSockets(true);
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await disconnectFromDatabase(); process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => { console.error("Unhandled rejection", reason); void shutdown("unhandledRejection"); });
process.on("uncaughtException", (error) => { console.error("Uncaught exception", error); void shutdown("uncaughtException"); });
