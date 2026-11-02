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
    heldAssets(
      orderBy: ASSET_ID_ASC
      filter: { amount: { greaterThan: "0" } }
    ) {
      totalCount
      nodes {
        amount
        asset {
          ...AssetFields
        }
      }
    }
    assetsOwned(orderBy: [NAME_ASC, TICKER_ASC, ID_ASC]) {
      totalCount
      nodes {
        ...AssetFields
      }
    }
    heldNfts: heldAssets(
      orderBy: ASSET_ID_ASC
      filter: { nftCount: { greaterThan: 0 } }
    ) {
      totalCount
      nodes {
        nftCount
        asset {
          ...AssetFields
        }
      }
    }
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
    legs {
      groupedAggregates(groupBy: [ASSET_ID]) {
        keys
      }
      nodes {
        legIndex
        legType
        from
        fromAccount
        fromPortfolio
        to
        toAccount
        toPortfolio
        assetId
        ticker
        amount
        nftIds
        addresses
      }
    }
    memo
    affirmations(orderBy: CREATED_BLOCK_ID_DESC) {
      nodes {
        identity
        isAutomaticallyAffirmed
        isMediator
        createdBlock {
          datetime
        }
        createdBlockId
        status
        portfolios
      }
    }
    mediators
    failureReason
    createdBlock {
      id
      blockId
      datetime
      hash
    }
    createdEvent {
      id
      eventId
      eventIdx
    }
    updatedBlock {
      id
      blockId
      hash
      datetime
    }
    events {
      nodes {
        id
        event
        eventIdx
        createdBlock {
          id
          blockId
          datetime
          hash
        }
      }
    }
  }
`;
