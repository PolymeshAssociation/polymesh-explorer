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
  // included, so the tokens of a page of holders are read in pages of their own.
  private async getNftIdsByHolder(
    assetId: string,
    dids: string[],
  ): Promise<Record<string, string[]>> {
    const query = gql`
      query HolderNfts(
        $assetId: String!
        $dids: [String!]!
        $first: Int!
        $offset: Int!
      ) {
        nfts(
          first: $first
          offset: $offset
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
      }
    `;

    const fetchPage = (offset: number) =>
      this.client.request<NftsResponse>(query, {
        assetId,
        dids,
        first: NFT_PAGE_SIZE,
        offset,
      });

    const firstPage = await fetchPage(0);
    const offsets = [];
    for (
      let offset = NFT_PAGE_SIZE;
      offset < firstPage.nfts.totalCount;
      offset += NFT_PAGE_SIZE
    ) {
      offsets.push(offset);
    }
    const otherPages = await Promise.all(offsets.map(fetchPage));

    const nftIdsByHolder: Record<string, string[]> = {};
    [firstPage, ...otherPages].forEach((page) =>
      page.nfts.nodes.forEach(({ nftId, holding }) => {
        nftIdsByHolder[holding.identityId] ??= [];
        nftIdsByHolder[holding.identityId].push(nftId);
      }),
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
