import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  getAgents: vi.fn().mockResolvedValue([]),
  getAllAccounts: vi.fn().mockResolvedValue([]),
  getAccountsByUser: vi.fn().mockResolvedValue([]),
  getAccountById: vi.fn().mockResolvedValue(null),
  getConversations: vi.fn().mockResolvedValue([]),
  getConversationById: vi.fn().mockResolvedValue(null),
  getConversationStats: vi.fn().mockResolvedValue({ open: 0, pending: 0, resolved: 0, snoozed: 0, total: 0 }),
  getMessagesByConversation: vi.fn().mockResolvedValue([]),
  getTickets: vi.fn().mockResolvedValue([]),
  getQueue: vi.fn().mockResolvedValue([]),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  getTags: vi.fn().mockResolvedValue([]),
  createTag: vi.fn().mockResolvedValue(undefined),
  deleteTag: vi.fn().mockResolvedValue(undefined),
  getAnalytics: vi.fn().mockResolvedValue({ byChannel: [], byStatus: [], totalMessages: 0, byAgent: [] }),
  markNotificationsAsRead: vi.fn().mockResolvedValue(undefined),
  markMessagesAsRead: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn().mockResolvedValue(undefined),
  createAccount: vi.fn().mockResolvedValue(1),
  deleteAccount: vi.fn().mockResolvedValue(undefined),
  updateAccount: vi.fn().mockResolvedValue(undefined),
  createConversation: vi.fn().mockResolvedValue(1),
  updateConversation: vi.fn().mockResolvedValue(undefined),
  createMessage: vi.fn().mockResolvedValue(1),
  createTicket: vi.fn().mockResolvedValue(1),
  updateTicket: vi.fn().mockResolvedValue(undefined),
  addToQueue: vi.fn().mockResolvedValue(1),
  getNextQueuePosition: vi.fn().mockResolvedValue(1),
  updateQueueItem: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  upsertContact: vi.fn().mockResolvedValue(1),
  getTagsByConversation: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./whatsapp", () => ({
  connectWhatsApp: vi.fn().mockResolvedValue(undefined),
  disconnectWhatsApp: vi.fn().mockResolvedValue(undefined),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  onQrCode: vi.fn(),
  onStatusChange: vi.fn(),
}));

vi.mock("./email", () => ({
  testImapConnection: vi.fn().mockResolvedValue(true),
  testSmtpConnection: vi.fn().mockResolvedValue(true),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  fetchEmails: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/socketio", () => ({
  getIo: vi.fn().mockReturnValue(null),
  initSocketIO: vi.fn(),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeCtx(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("auth router", () => {
  it("me returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated context", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Test User");
  });
});

describe("conversations router", () => {
  it("list returns empty array when no conversations", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.conversations.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns zero counts", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.conversations.stats();
    expect(result).toMatchObject({ open: 0, pending: 0, resolved: 0 });
  });
});

describe("tags router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.tags.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create tag calls db helper", async () => {
    const { createTag } = await import("./db");
    const caller = appRouter.createCaller(makeCtx());
    await caller.tags.create({ name: "Urgente", color: "#ef4444" });
    expect(createTag).toHaveBeenCalledWith("Urgente", "#ef4444");
  });

  it("delete tag calls db helper", async () => {
    const { deleteTag } = await import("./db");
    const caller = appRouter.createCaller(makeCtx());
    await caller.tags.delete({ id: 1 });
    expect(deleteTag).toHaveBeenCalledWith(1);
  });
});

describe("tickets router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.tickets.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("queue router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.queue.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("autoAssign returns 0 when no available agents", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.queue.autoAssign();
    expect(result.assigned).toBe(0);
  });
});

describe("notifications router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("analytics router", () => {
  it("overview returns empty analytics", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.analytics.overview({});
    expect(result).toMatchObject({ byChannel: [], byStatus: [], totalMessages: 0 });
  });
});

describe("users router", () => {
  it("agents returns empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.users.agents();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list requires admin role", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("list succeeds for admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
