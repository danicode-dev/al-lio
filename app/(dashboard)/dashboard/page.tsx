import { GuestApp } from "@/components/guest-app";
import { FpRecommendationsSection } from "@/components/fp/fp-recommendations-section";

export default function DashboardPage() {
  return (
    <>
      <FpRecommendationsSection />
      <GuestApp view="dashboard" />
    </>
  );
}
