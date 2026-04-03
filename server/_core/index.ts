import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initSocketIO } from "./socketio";
import { initChannelGateway } from "../channel-gateway";
import { startEmailPolling } from "../email-institutional";
import { initCaiusAgent } from "../caius-agent";
import { initWhatsAppAccounts } from "../whatsapp";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Socket.io
  initSocketIO(server);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Inicializar ChannelGateway: registra conectores e reconecta WhatsApp com sessão salva
  setTimeout(async () => {
    try {
      await initChannelGateway();
      console.log("[Server] ChannelGateway inicializado com sucesso.");
    } catch (err) {
      console.error("[Server] Erro ao inicializar ChannelGateway:", err);
    }

    // Reconectar contas WhatsApp com sessão salva no banco
    try {
      await initWhatsAppAccounts();
      console.log("[Server] Reconexão automática de contas WhatsApp concluída.");
    } catch (err) {
      console.error("[Server] Erro ao reconectar contas WhatsApp:", err);
    }

    // Polling automático de e-mails a cada 2 minutos para todas as contas de e-mail ativas
    setInterval(async () => {
      try {
        const { getAllAccounts } = await import("../db");
        const { fetchEmails } = await import("../email");
        const accounts = await getAllAccounts();
        for (const account of accounts) {
          if (account.channel === "email" && account.status === "connected" &&
              account.imapHost && account.imapUser && account.imapPassword) {
            fetchEmails(account).catch(err =>
              console.error(`[EmailPoller] Erro ao buscar e-mails da conta #${account.id}:`, err)
            );
          }
        }
      } catch (err) {
        console.error("[EmailPoller] Erro no ciclo de polling:", err);
      }
    }, 2 * 60 * 1000); // a cada 2 minutos
    console.log("[Server] Polling automático de e-mails iniciado (intervalo: 2 min).");

    // Inicializar módulo de E-mail Institucional (caixas postais + polling)
    try {
      await startEmailPolling();
      console.log("[Server] Módulo E-mail Institucional inicializado.");
    } catch (err) {
      console.error("[Server] Erro ao inicializar E-mail Institucional:", err);
    }
    // Inicializar módulo cAIus — Agente Institucional de IA
    try {
      await initCaiusAgent();
      console.log("[Server] Módulo cAIus inicializado com sucesso.");
    } catch (err) {
      console.error("[Server] Erro ao inicializar cAIus:", err);
    }
  }, 3000); // aguardar 3s para o banco estar pronto
}

startServer().catch(console.error);
