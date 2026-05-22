/** URL Supabase redirects to after email confirmation (must be allowed in Supabase dashboard). */
export function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") {
    return "http://localhost:8080/auth/callback";
  }
  return `${window.location.origin}/auth/callback`;
}
