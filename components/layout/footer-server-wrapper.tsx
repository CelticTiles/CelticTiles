import { getNavData, type CategoryWithChildren } from "@/lib/loaders"
import { Footer } from "./footer"

/**
 * Server Component wrapper for Footer.
 * Fetches categories on the server (no session dependency).
 */
interface FooterServerWrapperProps {
  categories?: CategoryWithChildren[]
}

export async function FooterServerWrapper({ categories: preloadedCategories }: FooterServerWrapperProps = {}) {
  const categories = preloadedCategories ?? (await getNavData()).categories

  return <Footer categories={categories} />
}
