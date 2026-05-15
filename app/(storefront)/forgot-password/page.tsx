import ForgotPasswordClient from "./ForgotPasswordClient"

export const metadata = {
  title: "Forgot Password | Celtic Tiles",
  description: "Reset your Celtic Tiles account password.",
}

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <ForgotPasswordClient />
    </div>
  )
}
