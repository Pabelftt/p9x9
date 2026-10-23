// /videos listing - same logic as old controllers/videoController.js dataRoute (new UI)
import { Suspense } from "react";
import { siteConfig } from "@/lib/siteConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchForm from "@/components/SearchForm";
import VideoSection from "@/components/VideoSection";
import GridSkeleton from "@/components/GridSkeleton";
import AdultWarning from "@/components/AdultWarning";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Videos",
  description: `Watch all free videos on ${siteConfig.websiteName}`,
  alternates: { canonical: "/videos" },
  openGraph: {
    type: "website",
    url: `${siteConfig.url}/videos`,
    title: `All Videos - ${siteConfig.websiteName}`,
    description: `Watch all free videos on ${siteConfig.websiteName}`,
    images: [{ url: siteConfig.img }]
  }
};

export default async function VideosPage({ searchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category =
    typeof params.category === "string" ? params.category.slice(0, 100) : "";
  const sort = params.sort === "popular" ? "popular" : "latest";

  return (
    <>
      <Header />
      <main>
        <div className="hero">
          <h1>ALL {siteConfig.websiteName} VIDEOS</h1>
          <p>{siteConfig.description}</p>
        </div>

        <div className="indexContainer">
          <SearchForm action="/videos" query={q} category={category} sort={sort} />

          <h2 className="section-title">
            <span>{q ? `Results for: ${q}` : category ? `Category: ${category}` : sort === "popular" ? "Most Viewed Videos" : "Browse Videos"}</span>
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