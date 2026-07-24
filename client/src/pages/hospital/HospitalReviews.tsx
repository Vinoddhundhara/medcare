import { useHospitalReviews } from "@/hooks/use-hospital-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

export default function HospitalReviews() {
  const { data, isLoading } = useHospitalReviews();

  const reviews = data?.reviews || [];
  const averageRating = data?.averageRating || 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm">Patient feedback for your hospital</p>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-yellow-500">{Number(averageRating).toFixed(1)}</p>
              <StarRating rating={Math.round(averageRating)} />
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = reviews.filter((r: any) => r.rating === star).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-xs w-2">{star}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-4">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : !reviews.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold">No reviews yet</h3>
            <p className="text-muted-foreground text-sm">Patient reviews will appear here after appointments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 font-bold">
                      {review.patient?.user?.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div>
                      <p className="font-medium">{review.patient?.user?.name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.createdAt ? format(new Date(review.createdAt), "MMM d, yyyy") : ""}
                      </p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
