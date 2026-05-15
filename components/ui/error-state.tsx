import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorStateProps {
    message?: string
    onRetry?: () => void
}

export function ErrorState({ 
    message = "Unable to load data. Please try again.", 
    onRetry 
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">{message}</p>
            {onRetry && (
                <Button 
                    variant="outline" 
                    onClick={onRetry}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            )}
        </div>
    )
}
