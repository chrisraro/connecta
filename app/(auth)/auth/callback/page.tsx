import PostLoginRedirect from "@/components/PostLoginRedirect";

/**
 * Auth callback page
 * This page is shown after sign-in/sign-up
 * It checks admin status and redirects accordingly
 */
export default function AuthCallbackPage() {
  return <PostLoginRedirect />;
}
