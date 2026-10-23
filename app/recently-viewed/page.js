import { siteConfig } from "@/lib/siteConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdultWarning from "@/components/AdultWarning";
import { RecentlyViewedCollection } from "@/components/PersonalCollections";

export const metadata = {
  title: `Recently viewed - ${siteConfig.websiteName}`,
  description: "Recently watched P9X9 videos in your local history.",
  alternates: { canonical: "/recently-viewed" }
};

export default function RecentlyViewedPage() {
  return (
    <>
      <Header />
      <main>
        <div className="indexContainer">
          <RecentlyViewedCollection />
        </div>
      </main>
      <Footer />
      <AdultWarning />
    </>
  );
}
