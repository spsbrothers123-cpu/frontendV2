import { Navigate } from "react-router-dom";

// Admin password reset no longer arrives by emailed link. This route is kept
// only so a link from an email sent before that change lands somewhere useful:
// it sends the Admin to the Forgot Password flow (passkey / recovery code).
export default function ResetPassword() {
  return <Navigate to="/admin/forgot-password" replace />;
}
