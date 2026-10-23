import { siteConfig } from "@/lib/siteConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdultWarning from "@/components/AdultWarning";
import { FavoritesCollection } from "@/components/PersonalCollections";

export const metadata = {
  title: `Favorites - ${siteConfig.websiteName}`,
  description: "Your saved P9X9 videos and favorites list.",
  alternates: { canonical: "/favorites" }
};

export default function FavoritesPage() {
  return (
    <>
      <Header />
      <main>
        <div className="indexContainer">
          <FavoritesCollection />
        </div>
      </main>
      <Footer />
      <AdultWarning />
    </>
  );
}
