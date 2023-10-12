import type {MicroCMSQueries} from "microcms-js-sdk";
import { createClient } from "microcms-js-sdk";
const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

export type Article = {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  revisedAt: string;
  title: string;
  content: string;
};

export type ArticleResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Article[];
};

export const getArticles = async (queries?: MicroCMSQueries) => {
    console.log("Get Articles !!!")
  return client.get<ArticleResponse>({ endpoint: "articles", queries });
};

export const getArticleDetail = async (
  contentId: string,
  queries?: MicroCMSQueries
) => {
    console.log("Get Article Detail!!!")
  return client.getListDetail<Article>({
    endpoint: "articles",
    contentId,
    queries,
  });
};