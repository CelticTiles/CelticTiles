import { IconSpinner } from "@/components/ui/icon-spinner"

export default function CouponsLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <IconSpinner label="Loading coupons..." />
    </div>
  )
}
