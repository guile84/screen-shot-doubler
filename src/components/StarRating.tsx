import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: "sm" | "md";
}

const StarRating = ({ rating, reviewCount, size = "sm" }: StarRatingProps) => {
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return count.toLocaleString("pt-BR");
    }
    return String(count);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = rating >= star ? 1 : rating >= star - 0.5 ? 0.5 : 0;
          return (
            <Star
              key={star}
              className={`${starSize} ${
                fill === 1
                  ? "fill-amber-400 text-amber-400"
                  : fill === 0.5
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-muted text-muted-foreground/30"
              }`}
            />
          );
        })}
      </div>
      {reviewCount != null && reviewCount > 0 && (
        <span className={`${textSize} text-muted-foreground`}>
          {formatCount(reviewCount)} avaliações
        </span>
      )}
    </div>
  );
};

export default StarRating;
