export function saveErrorMessage(
  error: unknown,
  subject = "your changes",
  { savedValueRestored = false }: { savedValueRestored?: boolean } = {},
): string {
  const err = error as {
    name?: string;
    message?: string;
    inner?: { name?: string };
    cause?: { name?: string };
  } | null;
  const names = [err?.name, err?.inner?.name, err?.cause?.name];
  if (names.includes("QuotaExceededError"))
    return `Could not save ${subject}: device storage is full. Free some space and try again. Existing records were not cleared.`;
  if (names.some((n) => n === "SecurityError" || n === "NotAllowedError"))
    return `Could not save ${subject}: this browser is blocking site storage. Allow site data or try a normal browser window. Existing records were not cleared.`;
  if (names.includes("VersionError"))
    return "An older app tab cannot open the updated database. Close other FORM tabs and reopen the latest app. Do not clear your site data.";
  if (
    names.some((n) =>
      [
        "MissingAPIError",
        "OpenFailedError",
        "InvalidStateError",
        "DatabaseClosedError",
      ].includes(n || ""),
    )
  )
    return "The local database could not be opened. Allow browser site storage and reopen FORM. Existing records were not cleared.";
  if (err?.message === "SecureRandomUnavailable")
    return "This browser cannot create record identifiers. Use an updated browser or HTTPS. Your form has been kept.";
  return `Could not save ${subject}. ${savedValueRestored ? "The previous saved value has been restored; please retry this change." : "Your form has been kept; please retry."} If this continues, report error code: ${err?.name || "UnknownError"}.`;
}
