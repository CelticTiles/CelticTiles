import { redirect } from "next/navigation"

export default async function AuthCallbackPage() {
  // Callback handling is performed in the API route; this page only normalizes navigation.
  redirect("/")
}
