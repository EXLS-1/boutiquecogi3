// app/admin/verify-2fa/page.tsx
import { redirect } from "next/navigation";

export default function AdminVerify2FARedirectPage() {
  redirect("/admin/settings/verify-2fa");
}

