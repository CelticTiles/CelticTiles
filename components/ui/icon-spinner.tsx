import Image from "next/image"

interface IconSpinnerProps {
  label?: string
  size?: number
  className?: string
}

export function IconSpinner({
  label = "Loading...",
  size = 56,
  className = "",
}: IconSpinnerProps) {
  return (
    <div className={`flex min-h-[220px] w-full items-center justify-center ${className}`.trim()}>
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/icon.png"
          alt="Loading"
          width={size}
          height={size}
          className="animate-spin"
          priority
        />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  )
}
