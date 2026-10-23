// Homepage "/" - same logic as old index.js "/" route (new UI)
import { Suspense } from "react";
import { siteConfig } from "@/lib/siteConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchForm from "@/components/SearchForm";
import VideoSection from "@/components/VideoSection";
import HeroStats from "@/components/HeroStats";
import GridSkeleton from "@/components/GridSkeleton";
import AdultWarning from "@/components/AdultWarning";


export const dynamic = "force-dynamic";

export const metadata = {
  title: siteConfig.websiteName,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: `${siteConfig.websiteName} - ${siteConfig.hadding}`,
    description: siteConfig.description,
    images: [{ url: siteConfig.img }]
  }
};

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category =
    typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const sort = params.sort === "popular" ? "popular" : "latest";

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.websiteName,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: {
      "@type": "Organization",
      name: siteConfig.websiteName,
      url: siteConfig.url
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <Header />
      <main>
        <div className="hero">
          <h1>WATCH FREE {siteConfig.websiteName} VIDEOS</h1>
          <p>{siteConfig.description}</p>
          <Suspense
            fallback={
              <div className="hero-stats">
                <span><b className="skeleton" style={{ display: "inline-block", width: 30, height: 16 }}></b> Videos</span>
                <span><b className="skeleton" style={{ display: "inline-block", width: 30, height: 16 }}></b> Categories</span>
                <span><b>24/7</b> Free</span>
              </div>
            }
          >
            <HeroStats />
          </Suspense>
        </div>

        <div className="indexContainer">
          <SearchForm query={q} category={category} sort={sort} />

          <h2 className="section-title">
            <span>{q ? `Results for: ${q}` : category ? `Category: ${category}` : sort === "popular" ? "Most Viewed Videos" : "Latest Videos"}</span>
          </h2>

          <Suspense fallback={<GridSkeleton />}>
            <VideoSection query={q} category={category} sort={sort} />
          </Suspense>
        </div>
      </main>
      <Footer />
      <AdultWarning />
    </>
  );
}