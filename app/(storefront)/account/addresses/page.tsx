import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import AddressesClient from "./AddressesClient"

export default async function AddressesPage() {
    const session = await getServerSession()

    // Not logged in - redirect to login
    if (!session.userId) {
        redirect("/login")
    }

    return (
        <AddressesClient session={session} />
    )
}
