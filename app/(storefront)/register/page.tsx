import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import RegisterClient from "./RegisterClient"
export default async function RegisterPage() {
    const session = await getServerSession()

    // Already logged in - redirect to home
    if (session.userId) {
        redirect("/")
    }

    return (
        <>
            <main className="bg-background min-h-screen">
                <div className="container mx-auto max-w-[1400px] px-4 py-12">
                    <RegisterClient />
                </div>
            </main>
        </>
    )
}

