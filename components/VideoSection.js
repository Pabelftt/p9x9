// Server component: cached video data (unstable_cache) + Suspense streaming
import { getPostsPage } from "@/lib/data";
import HomeGrid from "./HomeGrid";

export default async function VideoSection({ query, category, sort }) {
  const data = await getPostsPage({
    page: 1,
    limit: 10,
    q: query || "",
    category: category || "",
    sort: sort || "latest"
  });

  return (
    <HomeGrid
      query={query || ""}
      category={category || ""}
      sort={sort || "latest"}
      initialData={data.items}
      initialHasMore={data.hasMore}
    />
  );
}