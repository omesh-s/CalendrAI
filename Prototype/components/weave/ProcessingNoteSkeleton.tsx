import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProcessingNoteSkeleton() {
  return (
    <Card className="p-2 mb-1 animate-pulse">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-2 w-2 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-2 w-1/2" />
          <div className="flex space-x-1">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-2 w-36" />
          </div>
        </div>
      </div>
    </Card>
  );
} 