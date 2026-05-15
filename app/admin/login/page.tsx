import { redirect } from "next/navigation"

// Redirect old admin login URL to the unified login page.
export default function AdminLoginRedirect() {
  redirect("/login")
}
