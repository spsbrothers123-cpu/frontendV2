import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display font-extrabold text-6xl text-yolk-500 mb-2">404</p>
        <h1 className="font-display font-bold text-xl text-charcoal mb-2">Page not found</h1>
        <p className="text-sm text-charcoal-muted mb-6">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/admin/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
