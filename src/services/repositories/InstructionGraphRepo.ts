import { GraphQLClient, gql } from 'graphql-request';
import { DEFAULT_VENUE_ID } from '@/domain/entities/Venue';
import { SettlementInstructionWithAssets } from '@/domain/entities/SettlementInstruction';
import { rawInstructiontoSettlementInstruction } from '../transformers/instructionsTransformer';
import { pageInfoFragment, settlementInstructionFragment } from './fragments';
import { padId } from './paddedIds';
import {
  InstructionListResponse,
  InstructionResponse,
  LegAssetResponse,
  PageInfo,
  RawInstructionNode,
} from './types';

export class InstructionGraphRepo {
  constructor(private client: GraphQLClient) {}

  private async getAssetsDetails(instructions: RawInstructionNode[]) {
    const uniqueAssetIds = Array.from(
      new Set(
        instructions.flatMap((instruction) =>
          instruction.legs.groupedAggregates.flatMap(({ keys }) =>
            keys.filter((key): key is string => Boolean(key)),
          ),
        ),
      ),
    );

    const query = gql`
      query GetAssetDetails($assetIds: [String!]!) {
        assets(filter: { id: { in: $assetIds } }) {
          nodes {
            id
            ticker
            name
            isNftCollection
          }
        }
      }
    `;

    const response = await this.client.request<LegAssetResponse>(query, {
      assetIds: uniqueAssetIds,
    });

    return response.assets.nodes.reduce(
      (acc, node) => ({
        ...acc,
        [node.id]: node,
      }),
      {},
    );
  }

  async findById(id: string): Promise<SettlementInstructionWithAssets | null> {
    const query = gql`
      ${settlementInstructionFragment}
      query ($filter: InstructionFilter!) {
        instructions(filter: $filter, first: 1) {
          nodes {
            ...SettlementInstructionFields
          }
        }
      }
    `;

    const variables = {
      filter: { id: { equalTo: padId(id) } },
    };

    const response = await this.client.request<InstructionResponse>(
      query,
      variables,
    );
    const instructions = response.instructions.nodes.map(
      rawInstructiontoSettlementInstruction,
    );

    if (instructions.length === 0) return null;

    const assetsInvolved = await this.getAssetsDetails(
      response.instructions.nodes,
    );

    return { instructions, assetsInvolved };
  }

  async findByDid(
    did: string,
    pageSize: number,
    offset: number = 0,
    historicalInstructions: boolean = false,
  ): Promise<
    SettlementInstructionWithAssets & {
      totalCount: number;
      pageInfo: PageInfo;
    }
  > {
    const query = gql`
      ${pageInfoFragment}
      ${settlementInstructionFragment}
      query InstructionByDidQuery(
        $pageSize: Int!
        $offset: Int!
        $did: String!
      ) {
        instructions(
          first: $pageSize
          offset: $offset
          orderBy: CREATED_EVENT_ID_DESC
          filter: {
            and: [
              {
                legs: {
                  some: {
                    or: [
                      { fromId: { equalTo: $did } }
                      { toId: { equalTo: $did } }
                    ]
                  }
                }
              }
              { status: { ${historicalInstructions ? 'distinctFrom' : 'equalTo'}: Created } }
            ]
          }
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            ...SettlementInstructionFields
          }
        }
      }
    `;

    const variables = {
      pageSize,
      offset,
      did,
    };

    const response = await this.client.request<InstructionListResponse>(
      query,
      variables,
    );

    const assetsInvolved = await this.getAssetsDetails(
      response.instructions.nodes,
    );

    return {
      instructions: response.instructions.nodes.map(
        rawInstructiontoSettlementInstruction,
      ),
      assetsInvolved,
      totalCount: response.instructions.totalCount,
      pageInfo: response.instructions.pageInfo,
    };
  }

  async findByVenueId(
    venueId: string,
    pageSize: number,
    offset: number = 0,
    historicalInstructions: boolean = false,
  ): Promise<
    SettlementInstructionWithAssets & {
      totalCount: number;
      pageInfo: PageInfo;
    }
  > {
    const venueFilter =
      venueId === DEFAULT_VENUE_ID
        ? '{ venueId: { isNull: true } }'
        : '{ venueId: { equalTo: $venueId } }';
    const query = gql`
      ${pageInfoFragment}
      ${settlementInstructionFragment}
      query InstructionByVenueQuery(
        $pageSize: Int!
        $offset: Int!
        ${venueId === DEFAULT_VENUE_ID ? '' : '$venueId: String!'}
      ) {
        instructions(
          first: $pageSize
          offset: $offset
          orderBy: CREATED_EVENT_ID_DESC
          filter: {
            and: [
              ${venueFilter}
              { status: { ${historicalInstructions ? 'distinctFrom' : 'equalTo'}: Created } }
            ]
          }
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            ...SettlementInstructionFields
          }
        }
      }
    `;

    const variables = {
      pageSize,
      offset,
      venueId: padId(venueId),
    };

    const response = await this.client.request<InstructionListResponse>(
      query,
      variables,
    );

    const assetsInvolved = await this.getAssetsDetails(
      response.instructions.nodes,
    );

    return {
      instructions: response.instructions.nodes.map(
        rawInstructiontoSettlementInstruction,
      ),
      assetsInvolved,
      totalCount: response.instructions.totalCount,
      pageInfo: response.instructions.pageInfo,
    };
  }
}
