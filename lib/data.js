// lib/data.js — cached data access (Next Data Cache + tags, survives restarts)
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";

const databaseCacheNamespace = createHash("sha256")
  .update(process.env.MONGO_URI || "missing-mongo-uri")
  .digest("hex");

function safeRegex(q) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitize(items) {
  items.forEach((p) => {
    p.formattedDate = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString()
      : "";
    p._id = p._id ? p._id.toString() : p._id;
  });
  return items;
}

// public paginated list (home / videos / search / admin lists)
export const getPostsPage = unstable_cache(
  async ({
    page = 1,
    limit = 10,
    q = "",
    category = "",
    exclude = "",
    sort = "latest"
  }) => {
    await connectDB();
    const p = Math.min(1000, Math.max(1, Number.parseInt(page, 10) || 1));
    const lim = Math.min(50, Math.max(1, limit));
    const skip = (p - 1) * lim;

    let filter = {};
    if (q) {
      const expression = { $regex: safeRegex(q), $options: "i" };
      filter.$or = [{ title: expression }, { description: expression }];
    }
    if (category) filter.category = category;
    if (exclude) filter.routeName = { $ne: exclude };
    const ordering =
      sort === "popular" ? { totalView: -1, _id: -1 } : { _id: -1 };

    const [items, total] = await Promise.all([
      Post.find(filter).sort(ordering).skip(skip).limit(lim).lean(),
      Post.countDocuments(filter)
    ]);

    return {
      items: sanitize(items),
      total,
      page: p,
      hasMore: skip + items.length < total
    };
  },
  ["posts-page", databaseCacheNamespace],
  { revalidate: 60, tags: ["posts"] }
);

// homepage "latest 5 + random rest" (same logic as old index.js)
export const getHomeVideos = unstable_cache(
  async (limit = 10) => {
    await connectDB();
    const latestFive = await Post.find({})
      .sort({ _id: -1 })
      .limit(10)
      .lean();

    const restData = await Post.aggregate([
      { $match: { _id: { $nin: latestFive.map((d) => d._id) } } },
      { $sample: { size: limit } }
    ]);

    return sanitize([...latestFive, ...restData].slice(0, limit));
  },
  ["home-videos", databaseCacheNamespace],
  { revalidate: 60, tags: ["posts"] }
);

export const getCategories = unstable_cache(
  async () => {
    await connectDB();
    return Post.distinct("category");
  },
  ["categories", databaseCacheNamespace],
  { revalidate: 300, tags: ["posts"] }
);

export const getTotalCount = unstable_cache(
  async () => {
    await connectDB();
    return Post.countDocuments();
  },
  ["total-count", databaseCacheNamespace],
  { revalidate: 300, tags: ["posts"] }
);

// single video page data (video + related)
export const getVideoPage = unstable_cache(
  async (routeName) => {
    await connectDB();
    const [video, suggested] = await Promise.all([
      Post.findOne({ routeName })
        .select(
          "title description imageLink videoLink duration totalView createdAt category routeName"
        )
        .lean(),
      Post.find({ routeName: { $ne: routeName } })
        .select("title imageLink duration totalView routeName")
        .sort({ _id: -1 })
        .limit(30)
        .lean()
    ]);

    if (!video) return null;

    return {
      video: sanitize([video])[0],
      suggested: sanitize(suggested)
    };
  },
  ["video-page", databaseCacheNamespace],
  { revalidate: 30, tags: ["posts"] }
);

// all posts (desi sync / suggested load-more source)
export const getSuggested = unstable_cache(
  async () => {
    await connectDB();
    return sanitize(
      await Post.find({})
        .select("title imageLink duration totalView routeName")
        .sort({ _id: -1 })
        .lean()
    );
  },
  ["suggested", databaseCacheNamespace],
  { revalidate: 60, tags: ["posts"] }
);

export const getAllData = unstable_cache(
  async () => {
    await connectDB();
    return sanitize(await Post.find().lean());
  },
  ["data-all", databaseCacheNamespace],
  { revalidate: 60, tags: ["posts"] }
);