import { gql } from 'graphql-request';

// The event that created or last updated a row, with its block.
export const eventStampFields = `
  eventIdx
  block {
    blockId
    datetime
    hash
  }
`;

export const assetFragment = gql`
  fragment AssetFields on Asset {
    id
    ticker
    name
    type
    totalSupply
    isNftCollection
    isDivisible
    owner {
      did
    }
    documents {
      totalCount
    }
    holderCount
    createdEvent {
      ${eventStampFields}
    }
  }
`;

export const venueFragment = gql`
  fragment VenueFields on Venue {
    id
    nodeId
    details
    type
    ownerId
    createdEvent {
      ${eventStampFields}
    }
  }
`;

interface IdentityAssetList {
  field: string;
  args: string;
  nodeFields: string;
}

// An identity's asset lists. A nested connection stops at 100 rows without
// saying so, so the rows past that are read in pages with the same selection.
export const identityAssetLists = {
  heldAssets: {
    field: 'heldAssets',
    args: 'orderBy: ASSET_ID_ASC, filter: { amount: { greaterThan: "0" } }',
    nodeFields: 'amount asset { ...AssetFields }',
  },
  assetsOwned: {
    field: 'assetsOwned',
    args: 'orderBy: [NAME_ASC, TICKER_ASC, ID_ASC]',
    nodeFields: '...AssetFields',
  },
  heldNfts: {
    field: 'heldAssets',
    args: 'orderBy: ASSET_ID_ASC, filter: { nftCount: { greaterThan: 0 } }',
    nodeFields: 'nftCount asset { ...AssetFields }',
  },
};

export type IdentityAssetListName = keyof typeof identityAssetLists;

export const identityAssetListSelection = (
  alias: string,
  { field, args, nodeFields }: IdentityAssetList,
  paging = '',
) => `
  ${alias}: ${field}(${args} ${paging}) {
    totalCount
    nodes {
      ${nodeFields}
    }
  }
`;

export const identityFragment = gql`
  fragment IdentityFields on Identity {
    did
    primaryAccountId
    keys(
      filter: {
        role: { equalTo: SecondaryKey }
        validToBlockId: { isNull: true }
      }
    ) {
      totalCount
      nodes {
        accountId
      }
    }
    claims {
      totalCount
    }
    venues {
      totalCount
    }
    portfolios(filter: { deletedAt: { isNull: true } }) {
      totalCount
    }
    ${Object.entries(identityAssetLists)
      .map(([alias, list]) => identityAssetListSelection(alias, list))
      .join('\n')}
    custodiedPortfolios {
      totalCount
    }
    createdEvent {
      ${eventStampFields}
    }
  }
  ${assetFragment}
`;

export const pageInfoFragment = gql`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export const settlementInstructionFragment = gql`
  fragment SettlementInstructionFields on Instruction {
    id
    status
    venue {
      id
      details
    }
    type
    endBlock
    endAfterBlock
    tradeDate
    valueDate
    legs(orderBy: LEG_INDEX_ASC) {
      groupedAggregates(groupBy: [ASSET_ID]) {
        keys
      }
      nodes {
        legIndex
        legType
        fromId
        fromAccountId
        fromPortfolioId
        toId
        toAccountId
        toPortfolioId
        assetId
        ticker
        amount
        nftIds
        addresses
      }
    }
    memo
    affirmations(orderBy: [IS_MEDIATOR_ASC, ID_ASC]) {
      nodes {
        id
        identityId
        portfolioId
        accountId
        isAutomaticallyAffirmed
        isMediator
        status
        updatedEvent {
          block {
            datetime
          }
        }
      }
    }
    mediators
    createdEvent {
      id
      eventId
      ${eventStampFields}
    }
    updatedEvent {
      ${eventStampFields}
    }
    events(orderBy: CREATED_EVENT_ID_ASC) {
      nodes {
        id
        event
        createdEvent {
          ${eventStampFields}
        }
      }
    }
  }
`;
