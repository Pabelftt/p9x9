// /videos/:routeName - same logic as old controllers/videoController.js singleData
// (server does a read-only query for SEO + SSR data; the view count + cookie logic stays in /api/videos/:routeName)
import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getVideoPage } from "@/lib/data";
import { siteConfig } from "@/lib/siteConfig";
import {
  VIDEO_RETURN_COOKIE,
  getVideoReturnCookieExpiresAt,
  getVideoRedirectUrl,
  getVideoReturnPath
} from "@/lib/videoContinue";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import RelatedVideosSection from "@/components/RelatedVideosSection";
import RelatedGridSkeleton from "@/components/RelatedGridSkeleton";

import Ads from "@/components/Ads";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { routeName } = await params;

  try {
    await connectDB();
    const video = await Post.findOne({ routeName: routeName.toLowerCase() })
      .select("title description imageLink routeName category")
      .lean();

    if (!video) return { title: "Video not found" };

    return {
      title: `${video.title} - ${siteConfig.websiteName}`,
      description: video.description,
      keywords: Array.isArray(video.category) ? video.category.join(", ") : video.category,
      alternates: { canonical: `/videos/${video.routeName}` },
      openGraph: {
        type: "website",
        title: `${video.title} - ${siteConfig.websiteName}`,
        url: `${siteConfig.url}/videos/${video.routeName}`,
        images: [{ url: video.imageLink }],
        description: video.description
      },
      twitter: {
        card: "summary_large_image",
        title: `${video.title} - ${siteConfig.websiteName}`,
        description: video.description,
        images: [video.imageLink]
      },
      icons: { icon: siteConfig.img }
    };
  } catch (err) {
    console.error(err);
    return { title: siteConfig.websiteName };
  }
}

export default async function SingleVideoPage({ params }) {
  const { routeName } = await params;
  const routeNameLower = routeName.toLowerCase();

  // cached read-only query (30s) — SSR data for instant player, no client Loading flash
  let oneData = null;
  try {
    oneData = await getVideoPage(routeNameLower);
  } catch (err) {
    console.error(err);
  }

  if (!oneData || !oneData.video) notFound();

  const { video } = oneData;
  const returnPath = getVideoReturnPath(routeNameLower);
  const videoReturnCookie = (await cookies()).get(VIDEO_RETURN_COOKIE)?.value;
  const videoReturnExpiresAt = getVideoReturnCookieExpiresAt(
    videoReturnCookie,
    returnPath
  );

  // ================= TIME FORMAT (same as old singleData) =================
  let isoTime = null;
  let formattedDate = null;

  if (video.duration) {
    const parts = video.duration.split(":");
    const m = Number(parts[0]) || 0;
    const s = Number(parts[1]) || 0;
    isoTime = `PT${m}M${s}S`;
  }

  if (video.createdAt) {
    const d = new Date(video.createdAt);
    formattedDate = d.toISOString().split("T")[0];
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description,
    thumbnailUrl: [video.imageLink],
    uploadDate: formattedDate,
    duration: isoTime,
    contentUrl: `${siteConfig.url}/videos/${video.routeName}`,
    embedUrl: `${siteConfig.url}/videos/${video.routeName}`,
    potentialAction: {
      "@type": "SeekToAction",
      target: `${siteConfig.url}/videos/${video.routeName}?seek={seek_to_second_number}`,
      "startOffset-input": "required name=seek_to_second_number"
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: siteConfig.websiteName,
        item: siteConfig.url
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Videos",
        item: `${siteConfig.url}/videos`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: video.title
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <link rel="preload" as="image" href={video.imageLink} />

      <Header />
      <main>
        <div className="video-page">
          <div className="player-shell">
            <VideoPlayer
              key={routeNameLower}
              routeName={routeNameLower}
              initialData={video}
              hasContinued={Boolean(videoReturnExpiresAt)}
              continueExpiresAt={videoReturnExpiresAt}
              redirectAvailable={Boolean(getVideoRedirectUrl())}
            />
          </div>

          <aside className="related-col">
            <h2 className="section-title">
              <span>Related Videos</span>
            </h2>
            <Suspense fallback={<RelatedGridSkeleton />}>
              <RelatedVideosSection routeName={routeNameLower} />
            </Suspense>
          </aside>
        </div>
      </main>
      <Footer />
      <Ads />
    </>
  );
}