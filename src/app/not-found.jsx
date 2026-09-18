import Link from "next/link";
import Button from "../components/ui/Button.jsx";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-lg text-gray-600">Page not found</p>
        <Link href="/dashboard">
          <Button className="mt-6">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
