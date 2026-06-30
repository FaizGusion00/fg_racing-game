import { useState, FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";

type Mode = "login" | "register";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const neon = "#00ffff";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "#050814" }}
    >
      {/* Neon grid */}
      <div
        className="absolute inset-0 opacity-8"
        style={{
          backgroundImage: `linear-gradient(${neon}25 1px, transparent 1px), linear-gradient(90deg, ${neon}25 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-8" style={{ background: neon }} />
      <div className="absolute bottom-1/3 right-1/3 w-56 h-56 rounded-full blur-3xl opacity-8" style={{ background: neon }} />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-5xl font-black uppercase tracking-[0.2em] mb-2"
            style={{ color: neon, textShadow: `0 0 30px ${neon}, 0 0 80px ${neon}60` }}
          >
            APEX RUSH
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest">Futuristic Racing</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 flex flex-col gap-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${neon}40`,
            boxShadow: `0 0 40px ${neon}15`,
          }}
        >
          {/* Mode toggle */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2.5 font-black uppercase text-sm tracking-widest transition-all"
                style={{
                  background: mode === m ? neon : "transparent",
                  color: mode === m ? "#000" : "rgba(255,255,255,0.4)",
                  boxShadow: mode === m ? `0 0 16px ${neon}80` : "none",
                }}
              >
                {m === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === "register" ? "3-20 characters" : "Your username"}
                maxLength={20}
                autoComplete="username"
                className="px-4 py-3 rounded-xl text-white font-bold outline-none transition-all placeholder:text-gray-600"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${neon}40`,
                  boxShadow: username ? `0 0 12px ${neon}15` : "none",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="px-4 py-3 rounded-xl text-white font-bold outline-none transition-all placeholder:text-gray-600"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${neon}40`,
                  boxShadow: password ? `0 0 12px ${neon}15` : "none",
                }}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm font-bold text-center"
                style={{ background: "#ff224422", border: "1px solid #ff224460", color: "#ff6677" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 rounded-xl font-black text-lg uppercase tracking-widest transition-all mt-1"
              style={{
                background: loading ? "rgba(0,255,255,0.3)" : neon,
                color: "#000",
                boxShadow: loading ? "none" : `0 0 24px ${neon}60`,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (mode === "login" ? "Logging in..." : "Creating account...") : (mode === "login" ? "Login" : "Create Account")}
            </button>
          </form>

          {mode === "login" ? (
            <p className="text-center text-xs text-gray-500">
              No account yet?{" "}
              <button onClick={() => { setMode("register"); setError(""); }} className="font-bold" style={{ color: neon }}>
                Register here
              </button>
            </p>
          ) : (
            <p className="text-center text-xs text-gray-500">
              Already racing?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="font-bold" style={{ color: neon }}>
                Login
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-600">
          Your progress is saved automatically. Session lasts 6 hours.
        </p>
      </div>
    </div>
  );
}
