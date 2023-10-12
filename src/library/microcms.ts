import type {MicroCMSQueries} from "microcms-js-sdk";
import { createClient } from "microcms-js-sdk";
import fetch from "node-fetch";

const isMock = (): boolean => {
    return import.meta.env.DEV && import.meta.env.MOCK;
};

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
  shortDescription: string;
};

export type ArticleResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Article[];
};

export const getArticles = async (queries?: MicroCMSQueries): Promise<ArticleResponse> => {
  console.log("Get Articles !!!");
  if (isMock()) {
    return (await fetch("http://localhost:3000/articles")).json() as Promise<ArticleResponse>;
  } else {
    return client.get<ArticleResponse>({ endpoint: "articles", queries });
  }
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