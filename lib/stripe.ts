import { redirect } from "next/navigation";
import Stripe from "stripe";

interface SessionUser {
  user?: {
    id?: string;
    role?: "ADMIN" | "USER";
  };
}

export function requireAdmin(session: SessionUser) {
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }
}

export function requireAuth(session: SessionUser) {
  if (!session?.user?.id) {
    redirect("/login");
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);