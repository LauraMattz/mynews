import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function TriageSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="flex gap-1.5 pl-7">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <div className="flex gap-2 pl-7">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InsightSkeletons() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-52 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
