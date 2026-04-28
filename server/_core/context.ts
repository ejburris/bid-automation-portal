import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Local development fallback so the bid calculator/dashboard can run without OAuth.
  // Disable by setting LOCAL_DEV_AUTH=false.
  if (!user && process.env.NODE_ENV !== "production" && process.env.LOCAL_DEV_AUTH !== "false") {
    const now = new Date();
    user = {
      id: 1,
      openId: "local-dev-user",
      name: "Local Dev User",
      email: "local-dev@example.com",
      loginMethod: "local-dev",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
