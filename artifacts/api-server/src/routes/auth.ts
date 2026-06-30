import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, playerProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../lib/authMiddleware";

const authRouter = Router();

// POST /api/auth/register
authRouter.post("/auth/register", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  if (username.length < 3 || username.length > 20) {
    res.status(400).json({ error: "Username must be 3-20 characters" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  // Check uniqueness
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username: username.toLowerCase(), passwordHash })
    .returning();

  // Create profile
  await db.insert(playerProfilesTable).values({ userId: user.id });

  const token = signToken({ userId: user.id, username: user.username });
  res.status(201).json({ token, userId: user.id, username: user.username });
});

// POST /api/auth/login
authRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username });
  res.status(200).json({ token, userId: user.id, username: user.username });
});

// GET /api/auth/me — validate token
authRouter.get("/auth/me", requireAuth, (req, res) => {
  const user = req.user!;
  // Generate a fresh token (extends session by 6h from now)
  const token = signToken({ userId: user.userId, username: user.username });
  res.json({ token, userId: user.userId, username: user.username });
});

export default authRouter;
