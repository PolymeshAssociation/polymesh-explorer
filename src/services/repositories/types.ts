import { InstructionStatusEnum } from '@polymeshassociation/polymesh-sdk/types';
import { Portfolio } from '@/domain/entities/Portfolio';
import { PageInfo } from '@/domain/ui/PaginationInfo';

export type { PageInfo };

export interface RawPortfolio extends Pick<Portfolio, 'name' | 'number'> {
  identityId: Portfolio['id'];
}

interface CreatedBlockFields {
  blockId: number;
  datetime: string;
  hash: string;
}

export interface EventStamp {
  eventIdx: number;
  block: CreatedBlockFields;
}

// Assets
export interface AssetNode {
  id: string;
  ticker: string;
  createdEvent: EventStamp;
  name: string;
  type: string;
  totalSupply: string;
  isNftCollection: boolean;
  isDivisible: boolean;
  owner: {
    did: string;
  };
  documents: {
    totalCount: number;
  };
  holderCount: number;
}

export interface AssetResponse {
  assets: {
    nodes: AssetNode[];
  };
}

export interface AssetListResponse {
  assets: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: AssetNode[];
  };
}

// Asset Holders
export interface AssetHolderNode {
  identityId: string;
  amount: string;
  assetId: string;
}

export interface AssetHoldersResponse {
  assetHolders: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: AssetHolderNode[];
  };
}

// Nft Holders
export interface NftHoldersNode {
  identityId: string;
  nftCount: number;
}

export interface NftHoldersResponse {
  assetHolders: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: NftHoldersNode[];
  };
}

export interface NftsResponse {
  nfts: {
    totalCount: number;
    nodes: {
      nftId: string;
      holding: {
        identityId: string;
      };
    }[];
  };
}

// Identity
export interface IdentityNode {
  did: string;
  primaryAccountId: string | null;
  // Null when the stamp names an event the index did not store.
  createdEvent: EventStamp | null;
  keys: {
    totalCount: number;
    nodes: { accountId: string }[];
  };
  claims: {
    totalCount: number;
  };
  venues: {
    totalCount: number;
  };
  portfolios: {
    totalCount: number;
  };
  heldAssets: {
    totalCount: number;
    nodes: {
      amount: string;
      asset: AssetNode;
    }[];
  };
  assetsOwned: {
    totalCount: number;
    nodes: AssetNode[];
  };
  heldNfts: {
    totalCount: number;
    nodes: {
      asset: AssetNode;
      nftCount: number;
    }[];
  };
  custodiedPortfolios: {
    totalCount: number;
  };
}

export interface IdentityResponse {
  identities: {
    nodes: IdentityNode[];
  };
}

export interface IdentityAssetListPages {
  identity: Record<string, { nodes: unknown[] }>;
}

export interface IdentityListResponse {
  identities: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: IdentityNode[];
  };
}

// Venue
export interface VenueNode {
  id: string;
  createdEvent: EventStamp;
  details: string;
  type: string;
  ownerId: string;
}

export interface VenueResponse {
  venues: {
    nodes: VenueNode[];
  };
}

export interface VenueListResponse {
  venues: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: VenueNode[];
  };
}

// Portfolio
// A movement is an asset transaction between portfolios of one identity
// that no instruction made.
export interface PortfolioMovementNode {
  id: string;
  fromAccountId: string | null;
  fromPortfolio: RawPortfolio | null;
  toAccountId: string | null;
  toPortfolio: RawPortfolio | null;
  assetId: string;
  asset: {
    ticker: string;
  };
  amount: string | null;
  nftIds: string[] | null;
  address: string;
  memo: string | null;
  createdEvent: EventStamp;
}

export interface PortfolioMovementsResponse {
  assetTransactions: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: PortfolioMovementNode[];
  };
}

export interface AssetTransactionNode {
  id: string;
  fromAccountId: string | null;
  fromIdentityId: string | null;
  fromPortfolioId: string | null;
  fromPortfolio: RawPortfolio | null;
  toAccountId: string | null;
  toIdentityId: string | null;
  toPortfolioId: string | null;
  toPortfolio: RawPortfolio | null;
  assetId: string;
  asset: {
    ticker: string;
  };
  amount: string | null;
  nftIds: string[] | null;
  createdEvent: EventStamp & { extrinsicIdx: number | null };
  eventId: string;
  instructionId: string | null;
  instructionMemo: string | null;
  fundingRound: string | null;
  instruction: null | {
    venueId: string | null;
  };
}

export interface AssetTransactionsResponse {
  assetTransactions: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: AssetTransactionNode[];
  };
}

// Extrinsics (History Accounts)
export interface ExtrinsicNode {
  blockId: string;
  extrinsicIdx: number;
  address: string;
  nonce: number;
  moduleId: string;
  callId: string;
  args: Record<string, unknown> | null;
  success: boolean;
  specVersionId: number;
  extrinsicHash: string;
  block: {
    hash: string;
    datetime: string;
  };
}

export interface ExtrinsicResponse {
  totalCount: number;
  nodes: ExtrinsicNode[];
  pageInfo: PageInfo;
}

// Instruction
export interface RawBlock {
  id: string;
  blockId: number;
  datetime: string;
  hash: string;
}

export interface RawInstructionEvent {
  id: string;
  event: string;
  eventIdx: number;
  createdBlock: RawBlock;
}

export interface RawInstructionEventNode {
  id: string;
  event: string;
  createdEvent: EventStamp;
}

export interface RawLegNode {
  legIndex: number;
  legType: string;
  fromId: string | null;
  fromAccountId: string | null;
  fromPortfolioId: string | null;
  toId: string | null;
  toAccountId: string | null;
  toPortfolioId: string | null;
  // Null on an off-chain leg, which names its asset by ticker
  assetId: string | null;
  ticker: string | null;
  amount: string;
  nftIds: string[] | null;
  addresses: string[];
}

// One row per holder (a portfolio or an account) on the legs, and one per
// mediator. Every row exists from the instruction's creation, Pending until
// its holder affirms.
export interface RawAffirmationNode {
  id: string;
  identityId: string;
  portfolioId: string | null;
  accountId: string | null;
  isAutomaticallyAffirmed: boolean;
  isMediator: boolean;
  status: 'Pending' | 'Affirmed';
  updatedEvent: {
    block: {
      datetime: string;
    };
  } | null;
}

export interface RawInstructionNode {
  id: string;
  status: InstructionStatusEnum;
  venue?: {
    id: string;
    details: string;
  };
  type: string;
  endBlock: string | null;
  endAfterBlock: string | null;
  tradeDate: string | null;
  valueDate: string | null;
  legs: {
    nodes: RawLegNode[];
    groupedAggregates: {
      keys: (string | null)[];
    }[];
  };
  memo: string | null;
  affirmations: {
    nodes: RawAffirmationNode[];
  };
  mediators: string[];
  createdEvent: EventStamp & {
    id: string;
    eventId: string;
  };
  updatedEvent: EventStamp;
  events: {
    nodes: RawInstructionEventNode[];
  };
}

export interface InstructionResponse {
  instructions: {
    nodes: RawInstructionNode[];
  };
}
export interface InstructionListResponse {
  instructions: {
    totalCount: number;
    nodes: RawInstructionNode[];
    pageInfo: PageInfo;
  };
}

export interface LegAssetNode {
  id: string;
  ticker: string;
  name: string;
  isNftCollection: boolean;
}

export interface LegAssetResponse {
  assets: {
    nodes: AssetNode[];
  };
}
