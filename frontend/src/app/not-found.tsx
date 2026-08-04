import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">Page not found</h1>
      <Link className="text-primary underline" href="/">
        Return home
      </Link>
    </div>
  );
}
