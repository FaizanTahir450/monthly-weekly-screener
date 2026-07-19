type StarRatingProps = {
  stars: number;
};

export function StarRating({ stars }: StarRatingProps) {
  return (
    <div
      className="flex min-w-24 items-center gap-1"
      aria-label={`${stars} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={index < stars ? "text-amber-300" : "text-slate-700"}
        >
          &#9733;
        </span>
      ))}
      <span className="ml-1 text-xs text-slate-400">{stars}/5</span>
    </div>
  );
}
