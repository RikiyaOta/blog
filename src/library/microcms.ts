import type {MicroCMSQueries} from "microcms-js-sdk";
import { createClient } from "microcms-js-sdk";

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
  isSecret: boolean;
};

export type ArticleResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Article[];
};

const _getArticles = async (queries?: MicroCMSQueries, isSecret?: boolean): Promise<ArticleResponse> => {
    const newQueries: MicroCMSQueries = {
        ...queries,
        ...(isSecret !== undefined ? {filters: `isSecret[equals]${isSecret}`} : {}),
        orders: "orders=-publishedAt"
    };

    return client.get<ArticleResponse>({ endpoint: "articles", queries: newQueries });
};

export const getArticles = async (queries?: MicroCMSQueries): Promise<ArticleResponse> => {
    console.log("Get Articles !!!");
    return _getArticles(queries);
};

/**
 * `isSecret`が`false`の記事の一覧を取得する。
 * @param queries 
 */
export const getPublicArticles = async (queries?: MicroCMSQueries) => {
    console.debug("Get Public Articles !!!");
    return _getArticles(queries, false);
};

/**
 * `isSecret`が`true`の記事の一覧を取得する。
 * @param queries 
 */
export const getSecretArticles = async (queries?: MicroCMSQueries) => {
    console.debug("Get Secret Articles !!!");
    return _getArticles(queries, true);
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