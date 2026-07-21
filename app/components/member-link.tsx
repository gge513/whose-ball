import Link from "next/link";

/**
 * A member's name is a door to their page (the season narrative lives
 * there) — everywhere one renders, it links. Interaction patterns are
 * promises: two dead name-clicks teach "names aren't links here" and the
 * member pages go undiscovered. Falls back to plain text when there is
 * no member behind the name (unassigned, deleted).
 */
export function MemberLink({
  id,
  name,
  className = "",
}: {
  id: number | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  const label = name ?? "someone";
  if (!id) return <span className={className}>{label}</span>;
  return (
    <Link
      href={`/members/${id}`}
      className={`hover:underline ${className}`}
    >
      {label}
    </Link>
  );
}
