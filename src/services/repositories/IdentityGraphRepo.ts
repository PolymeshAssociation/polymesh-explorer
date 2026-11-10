import { GraphQLClient, gql } from 'graphql-request';
import { Identity } from '@/domain/entities/Identity';
import {
  IdentityAssetListName,
  assetFragment,
  identityAssetListSelection,
  identityAssetLists,
  identityFragment,
  pageInfoFragment,
} from './fragments';
import {
  IdentityAssetListPages,
  IdentityListResponse,
  IdentityNode,
  IdentityResponse,
  PageInfo,
} from './types';
import { identityNodeToIdentity } from '@/services/repositories/nodeTransformers';

const ASSET_LIST_PAGE_SIZE = 100;
const ASSET_LIST_PAGES_PER_REQUEST = 10;

export class IdentityGraphRepo {
  constructor(private client: GraphQLClient) {}

  private async withCompleteAssetLists(
    node: IdentityNode,
  ): Promise<IdentityNode> {
    const names = Object.keys(identityAssetLists) as IdentityAssetListName[];
    const pages = names.flatMap((name) => {
      const offsets = [];
      for (
        let offset = node[name].nodes.length;
        offset < node[name].totalCount;
        offset += ASSET_LIST_PAGE_SIZE
      ) {
        offsets.push(offset);
      }
      return offsets.map((offset) => ({
        name,
        offset,
        alias: `${name}${offset}`,
      }));
    });

    if (pages.length === 0) return node;

    const batches = [];
    for (let i = 0; i < pages.length; i += ASSET_LIST_PAGES_PER_REQUEST) {
      batches.push(pages.slice(i, i + ASSET_LIST_PAGES_PER_REQUEST));
    }

    const responses = await Promise.all(
      batches.map((batch) =>
        this.client.request<IdentityAssetListPages>(
          gql`
            ${assetFragment}
            query ($did: String!) {
              identity(id: $did) {
                ${batch
                  .map(({ name, offset, alias }) =>
                    identityAssetListSelection(
                      alias,
                      identityAssetLists[name],
                      `, first: ${ASSET_LIST_PAGE_SIZE}, offset: ${offset}`,
                    ),
                  )
                  .join('\n')}
              }
            }
          `,
          { did: node.did },
        ),
      ),
    );
    const pagesByAlias = Object.assign(
      {},
      ...responses.map(({ identity }) => identity),
    );

    return names.reduce<IdentityNode>(
      (complete, name) => ({
        ...complete,
        [name]: {
          ...node[name],
          nodes: [
            ...node[name].nodes,
            ...pages
              .filter((page) => page.name === name)
              .flatMap(({ alias }) => pagesByAlias[alias].nodes),
          ],
        },
      }),
      node,
    );
  }

  async findByIdentifier(did: string): Promise<Identity | null> {
    const query = gql`
      ${identityFragment}
      query ($filter: IdentityFilter!) {
        identities(filter: $filter, first: 1) {
          nodes {
            ...IdentityFields
          }
        }
      }
    `;

    const variables = {
      filter: { did: { equalTo: did } },
    };

    const response = await this.client.request<IdentityResponse>(
      query,
      variables,
    );
    const identities = response.identities.nodes;

    if (identities.length === 0) return null;

    const identity = identities[0];

    return identityNodeToIdentity(await this.withCompleteAssetLists(identity));
  }

  async existsByIdentifier(partialDid: string): Promise<Identity[]> {
    const query = gql`
      ${identityFragment}
      query ($filter: IdentityFilter!) {
        identities(filter: $filter, first: 5) {
          nodes {
            ...IdentityFields
          }
        }
      }
    `;

    const variables = {
      filter: { did: { startsWith: partialDid } },
    };

    const response = await this.client.request<IdentityResponse>(
      query,
      variables,
    );

    return response.identities.nodes.map((node) =>
      identityNodeToIdentity(node),
    );
  }

  async getIdentityList(
    first: number,
    after?: string,
  ): Promise<{
    identities: Identity[];
    totalCount: number;
    pageInfo: PageInfo;
  }> {
    const query = gql`
      ${identityFragment}
      ${pageInfoFragment}
      query ($first: Int!, $after: Cursor) {
        identities(
          first: $first
          after: $after
          orderBy: CREATED_EVENT_ID_DESC
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            ...IdentityFields
          }
        }
      }
    `;

    const variables = {
      first,
      after,
    };

    const response = await this.client.request<IdentityListResponse>(
      query,
      variables,
    );
    const { identities } = response;

    return {
      identities: identities.nodes.map((node) => identityNodeToIdentity(node)),
      totalCount: identities.totalCount,
      pageInfo: identities.pageInfo,
    };
  }

  async getIdentityCreationCountByMonth(
    months: number = 12,
  ): Promise<{ date: string; count: number }[]> {
    const endDate = new Date();
    const queries = [];

    for (let i = 0; i < months; i += 1) {
      const monthStart = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - i,
        1,
      );
      const monthEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999,
      );

      queries.push(`
        month${i}: identities(filter: {createdEvent: {block: {datetime: {
                              greaterThanOrEqualTo: "${monthStart.toISOString()}",
                              lessThanOrEqualTo: "${monthEnd.toISOString()}"}}}}) {
          totalCount
        }
      `);
    }

    const query = gql`
      query GetIdentityCreationCountByMonth {
        ${queries.join('\n')}
      }
    `;

    const response =
      await this.client.request<Record<string, { totalCount: number }>>(query);

    const result = Object.entries(response).map(([key, value]) => {
      const monthIndex = parseInt(key.replace('month', ''), 10);
      const date = new Date(
        endDate.getFullYear(),
        endDate.getMonth() - monthIndex,
        1,
      );
      return {
        date: date.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }),
        count: value.totalCount,
      };
    });

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}
