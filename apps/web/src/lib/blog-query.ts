import type {
  MarbleAuthorList,
  MarbleCategoryList,
  MarblePost,
  MarblePostList,
  MarbleTagList,
} from "@/types/post";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";

const url =
  process.env.NEXT_PUBLIC_MARBLE_API_URL ?? "https://api.marblecms.com";
const key = process.env.MARBLE_WORKSPACE_KEY ?? "cmd4iw9mm0006l804kwqv0k46";

const emptyPagination = {
  limit: 10,
  currpage: 1,
  nextPage: null,
  prevPage: null,
  totalItems: 0,
  totalPages: 0,
};

async function fetchFromMarble<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${url}/${key}/${endpoint}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

export async function getPosts() {
  if (process.env.UNIVA_LOCAL_MODE === "true")
    return { posts: [], pagination: emptyPagination };
  return fetchFromMarble<MarblePostList>("posts");
}

export async function getTags() {
  if (process.env.UNIVA_LOCAL_MODE === "true")
    return { tags: [], pagination: emptyPagination };
  return fetchFromMarble<MarbleTagList>("tags");
}

export async function getSinglePost(slug: string) {
  if (process.env.UNIVA_LOCAL_MODE === "true") return { post: null };
  return fetchFromMarble<MarblePost>(`posts/${slug}`);
}

export async function getCategories() {
  if (process.env.UNIVA_LOCAL_MODE === "true")
    return { categories: [], pagination: emptyPagination };
  return fetchFromMarble<MarbleCategoryList>("categories");
}

export async function getAuthors() {
  if (process.env.UNIVA_LOCAL_MODE === "true")
    return { authors: [], pagination: emptyPagination };
  return fetchFromMarble<MarbleAuthorList>("authors");
}

export async function processHtmlContent(html: string): Promise<string> {
  const processor = unified()
    .use(rehypeSanitize)
    .use(rehypeParse, { fragment: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(rehypeStringify);

  const file = await processor.process(html);
  return String(file);
}
