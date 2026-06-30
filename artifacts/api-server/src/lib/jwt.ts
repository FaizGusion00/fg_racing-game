import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "apex-rush-dev-secret";
const JWT_EXPIRES_IN = "6h";

export interface JwtPayload {
  userId: number;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & jwt.JwtPayload;
  return { userId: decoded.userId, username: decoded.username };
}
