import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import LoginClient from "./LoginClient"
export default async function LoginPage() {
    const session = await getServerSession()

    // Already logged in - redirect to home
    if (session.userId) {
        redirect("/")
    }

    return (
        <>
            <main className="bg-background min-h-screen">
                <div className="container mx-auto max-w-[1400px] px-4 py-12">
                    <LoginClient />
                </div>
            </main>
        </>
    )
}

