import { GraphQLClient, gql } from 'graphql-request';
import { pageInfoFragment } from './fragments';
import {
  AssetHoldersResponse,
  NftHoldersResponse,
  NftsResponse,
  PageInfo,
} from './types';
import { AssetHolder } from '@/domain/entities/AssetHolder';
import { assetHolderNodeToAssetHolder } from './nodeTransformers';

const NFT_PAGE_SIZE = 100;
const NFT_PAGES_PER_REQUEST = 25;

export class AssetHoldersGraphRepo {
  constructor(private client: GraphQLClient) {}

  async getAssetHolders(
    assetId: string,
    first: number,
    offset: number = 0,
  ): Promise<{
    holders: AssetHolder[];
    totalCount: number;
    pageInfo: PageInfo;
  }> {
    const query = gql`
      ${pageInfoFragment}
      query AssetHolders($first: Int!, $offset: Int!, $assetId: String!) {
        assetHolders(
          first: $first
          offset: $offset
          orderBy: AMOUNT_DESC
          filter: {
            assetId: { equalTo: $assetId }
            amount: { greaterThan: "0" }
          }
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            identityId
            amount
            assetId
          }
        }
      }
    `;

    const response = await this.client.request<AssetHoldersResponse>(query, {
      first,
      offset,
      assetId,
    });

    return {
      holders: response.assetHolders.nodes.map(assetHolderNodeToAssetHolder),
      totalCount: response.assetHolders.totalCount,
      pageInfo: response.assetHolders.pageInfo,
    };
  }

  // The query service returns at most 100 rows per connection, nested ones
  // included, so the tokens of a page of holders are read in pages of their
  // own. The pages after the first go as aliases of one request: the service
  // answers concurrent requests one at a time.
  private async getNftIdsByHolder(
    assetId: string,
    dids: string[],
  ): Promise<Record<string, string[]>> {
    const page = (alias: string, offset: number) => `
      ${alias}: nfts(
        first: ${NFT_PAGE_SIZE}
        offset: ${offset}
        orderBy: [NFT_ID_ASC]
        filter: {
          assetId: { equalTo: $assetId }
          holding: { identityId: { in: $dids } }
        }
      ) {
        totalCount
        nodes {
          nftId
          holding {
            identityId
          }
        }
      }
    `;
    const fetchPages = (offsets: number[]) =>
      this.client.request<Record<string, NftsResponse['nfts']>>(
        gql`
          query HolderNfts($assetId: String!, $dids: [String!]!) {
            ${offsets.map((offset) => page(`page${offset}`, offset)).join('\n')}
          }
        `,
        { assetId, dids },
      );

    const first = await fetchPages([0]);
    const { totalCount } = first.page0;
    const offsets = [];
    for (
      let offset = NFT_PAGE_SIZE;
      offset < totalCount;
      offset += NFT_PAGE_SIZE
    ) {
      offsets.push(offset);
    }
    const batches = [];
    for (let i = 0; i < offsets.length; i += NFT_PAGES_PER_REQUEST) {
      batches.push(offsets.slice(i, i + NFT_PAGES_PER_REQUEST));
    }
    const rest = await Promise.all(batches.map(fetchPages));

    const nftIdsByHolder: Record<string, string[]> = {};
    [first, ...rest].forEach((response) =>
      Object.values(response).forEach((connection) =>
        connection.nodes.forEach(({ nftId, holding }) => {
          nftIdsByHolder[holding.identityId] ??= [];
          nftIdsByHolder[holding.identityId].push(nftId);
        }),
      ),
    );

    return nftIdsByHolder;
  }

  async getNftHolders(
    assetId: string,
    first: number,
    offset: number = 0,
  ): Promise<{
    holders: AssetHolder[];
    totalCount: number;
    pageInfo: PageInfo;
  }> {
    const query = gql`
      ${pageInfoFragment}
      query NftHolders($first: Int!, $offset: Int!, $assetId: String!) {
        assetHolders(
          first: $first
          offset: $offset
          orderBy: [NFT_COUNT_DESC, IDENTITY_ID_ASC]
          filter: {
            assetId: { equalTo: $assetId }
            nftCount: { greaterThan: 0 }
          }
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            identityId
            nftCount
          }
        }
      }
    `;

    const response = await this.client.request<NftHoldersResponse>(query, {
      first,
      offset,
      assetId,
    });
    const { nodes } = response.assetHolders;

    const nftIdsByHolder = nodes.length
      ? await this.getNftIdsByHolder(
          assetId,
          nodes.map((node) => node.identityId),
        )
      : {};

    return {
      holders: nodes.map((node) => ({
        identityDid: node.identityId,
        balance: node.nftCount.toString(),
        nftIds: nftIdsByHolder[node.identityId] ?? [],
      })),
      totalCount: response.assetHolders.totalCount,
      pageInfo: response.assetHolders.pageInfo,
    };
  }
}
