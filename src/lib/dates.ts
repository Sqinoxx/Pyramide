/** Latest of the given dates, ignoring null/undefined. Throws if none are given — callers must supply at least one guaranteed-present baseline. */
export function maxDate(...dates: (Date | null | undefined)[]): Date {
  const present = dates.filter((d): d is Date => !!d);
  if (present.length === 0) {
    throw new Error("maxDate() requires at least one non-null date");
  }
  return new Date(Math.max(...present.map((d) => d.getTime())));
}
