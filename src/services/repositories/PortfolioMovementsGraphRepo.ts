import { GraphQLClient, gql } from 'graphql-request';
import { PortfolioMovement } from '@/domain/entities/PortfolioMovement';
import { portfolioMovementNodeToPortfolioMovement } from '@/services/repositories/nodeTransformers';
import { eventStampFields, pageInfoFragment } from './fragments';
import { PageInfo, PortfolioMovementsResponse } from './types';

export type PortfolioMovementType = 'Fungible' | 'NonFungible';

export class PortfolioMovementsGraphRepo {
  constructor(private client: GraphQLClient) {}

  async getPortfolioMovements(
    pageSize: number,
    portfolioId: string,
    type: PortfolioMovementType,
    offset: number = 0,
  ): Promise<{
    movements: PortfolioMovement[];
    totalCount: number;
    pageInfo: PageInfo;
  }> {
    const query = gql`
      ${pageInfoFragment}
      query ($pageSize: Int!, $offset: Int!, $portfolioId: String!, $nonFungible: Boolean!) {
        assetTransactions(
          first: $pageSize
          offset: $offset
          orderBy: CREATED_EVENT_ID_DESC
          filter: {
            isInternalTransfer: { equalTo: true }
            amount: { isNull: $nonFungible }
            or: [
              { fromPortfolioId: { equalTo: $portfolioId } }
              { toPortfolioId: { equalTo: $portfolioId } }
            ]
          }
        ) {
          totalCount
          pageInfo {
            ...PageInfoFields
          }
          nodes {
            id
            fromAccountId
            fromPortfolio {
              identityId
              number
              name
            }
            toAccountId
            toPortfolio {
              identityId
              number
              name
            }
            assetId
            asset {
              ticker
            }
            amount
            nftIds
            address
            memo
            createdEvent {
              ${eventStampFields}
            }
          }
        }
      }
    `;

    const variables = {
      pageSize,
      offset,
      portfolioId,
      nonFungible: type === 'NonFungible',
    };

    const response = await this.client.request<PortfolioMovementsResponse>(
      query,
      variables,
    );
    const { assetTransactions } = response;

    return {
      movements: assetTransactions.nodes.map(
        portfolioMovementNodeToPortfolioMovement,
      ),
      totalCount: assetTransactions.totalCount,
      pageInfo: assetTransactions.pageInfo,
    };
  }
}
