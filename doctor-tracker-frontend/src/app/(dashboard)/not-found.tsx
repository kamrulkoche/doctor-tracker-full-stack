import { NotFoundState } from "@/components/shared/not-found-state";
import { ROUTES } from "@/constants/app";

export default function DashboardNotFound() {
  return (
    <NotFoundState
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      backHref={ROUTES.dashboard}
      backLabel="Back to dashboard"
    />
  );
}
