const BASE = "http://localhost:3000";
const FAKE = "better-auth.session_token=STALE_INVALID_TOKEN%3D";

// 1. /profile avec un cookie périmé → doit 307 vers sign-in (page server)
const r1 = await fetch(BASE + "/profile", { headers: { cookie: FAKE }, redirect: "manual" });
console.log("GET /profile (cookie périmé):", r1.status, "→", r1.headers.get("location"));

// 2. /auth/sign-in avec le même cookie périmé → ne doit PAS rebondir (200)
const loc = r1.headers.get("location") || "/auth/sign-in";
const r2 = await fetch(BASE + loc, { headers: { cookie: FAKE }, redirect: "manual" });
console.log("GET", loc, "(cookie périmé):", r2.status, "→", r2.headers.get("location"));

// 3. get-session avec cookie périmé
const r3 = await fetch(BASE + "/api/auth/get-session", { headers: { cookie: FAKE } });
console.log("get-session:", r3.status, (await r3.text()).slice(0, 120));

