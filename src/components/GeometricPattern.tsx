// A small hand-built Islamic geometric motif (two overlapping squares,
// forming an 8-pointed star lattice), tiled as an SVG pattern. Deliberately
// not a downloaded stock asset — see the design discussion in chat. Color
// comes from `currentColor`, so control it with a Tailwind text-* class on
// the wrapping/consuming element.
export function GeometricPattern({
  className,
  id = "ilmaquest-geo-tile",
}: {
  className?: string;
  id?: string;
}) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="1" fill="none">
            <rect x="18" y="18" width="24" height="24" />
            <rect x="18" y="18" width="24" height="24" transform="rotate(45 30 30)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
