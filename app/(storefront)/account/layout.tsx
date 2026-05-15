import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import { AccountSidebar } from "@/components/account/AccountSidebar"
import { Card, CardContent } from "@/components/ui/card"

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession()

    if (!session.userId) {
        redirect("/login")
    }

    return (
        <>
            <main className="bg-[#E5E9F0] min-h-screen">
                <div className="container mx-auto max-w-[1400px] px-4 py-8 md:py-12">
                    <div className="mb-8 md:mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-tm-text font-serif mb-2">My Account</h1>
                        <p className="text-tm-text-muted font-medium">Welcome back, <span className="text-primary">{session.userName}</span></p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12">
                        <div className="lg:col-span-1">
                            <Card className="border-none neu-raised bg-[#E5E9F0] rounded-[2rem] overflow-hidden sticky top-32">
                                <CardContent className="p-4">
                                    <AccountSidebar />
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-3">
                            {children}
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
