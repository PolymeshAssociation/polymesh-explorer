import { Balance } from '@polkadot/types/interfaces';
import { balanceToBigNumber } from '@polymeshassociation/polymesh-sdk/utils/conversion';
import { Asset } from '@/domain/entities/Asset';
import { AssetHolder } from '@/domain/entities/AssetHolder';
import { AssetTransaction } from '@/domain/entities/AssetTransaction';
import { ExtrinsicTransaction } from '@/domain/entities/ExtrinsicTransaction';
import { Identity } from '@/domain/entities/Identity';
import { Portfolio } from '@/domain/entities/Portfolio';
import { PortfolioMovement } from '@/domain/entities/PortfolioMovement';
import { Venue } from '@/domain/entities/Venue';
import { hexToUuid } from '../polymesh/hexToUuid';
import { unpadId } from './paddedIds';
import {
  AssetHolderNode,
  AssetNode,
  AssetTransactionNode,
  ExtrinsicNode,
  IdentityNode,
  PortfolioMovementNode,
  RawPortfolio,
  VenueNode,
} from './types';

export function assetNodeToAsset({
  asset,
  heldAmount,
  heldNftCount,
}: {
  asset: AssetNode;
  heldAmount?: string;
  heldNftCount?: number;
}): Asset {
  return {
    assetId: asset.id,
    assetUuid: hexToUuid(asset.id),
    ticker: asset.ticker,
    name: asset.name,
    type: asset.type,
    totalSupply:
      !asset.isNftCollection && asset.totalSupply
        ? balanceToBigNumber(asset.totalSupply as unknown as Balance).toString()
        : asset.totalSupply,
    ownerDid: asset.owner.did,
    isNftCollection: asset.isNftCollection,
    isDivisible: asset.isDivisible,
    totalHolders: asset.holderCount.toString(),
    createdAt: new Date(`${asset.createdEvent.block.datetime}Z`),
    totalDocuments: asset.documents.totalCount.toString(),
    heldAmount: heldAmount
      ? balanceToBigNumber(heldAmount as unknown as Balance).toString()
      : undefined,
    heldNftCount,
  };
}

export function identityNodeToIdentity(node: IdentityNode): Identity {
  return {
    did: node.did,
    primaryAccount: node.primaryAccountId ?? '',
    secondaryAccounts: node.keys.nodes.map((key) => key.accountId),
    createdAt: node.createdEvent
      ? new Date(`${node.createdEvent.block.datetime}Z`)
      : undefined,
    claimsCount: node.claims.totalCount,
    assetsCount: node.heldAssets.totalCount + node.heldNfts.totalCount,
    venuesCount: node.venues.totalCount,
    portfoliosCount: node.portfolios.totalCount,
    ownedAssets: node.assetsOwned.nodes.map((asset) =>
      assetNodeToAsset({ asset }),
    ),
    heldAssets: node.heldAssets.nodes
      .map((heldAsset) =>
        assetNodeToAsset({
          asset: heldAsset.asset,
          heldAmount: heldAsset.amount,
        }),
      )
      .concat(
        node.heldNfts.nodes.map((nft) =>
          assetNodeToAsset({ asset: nft.asset, heldNftCount: nft.nftCount }),
        ),
      ),
    isCustodian: node.custodiedPortfolios.totalCount > 0,
    custodiedPortfoliosCount: node.custodiedPortfolios.totalCount,
  };
}

export function venueNodeToVenue(node: VenueNode): Venue {
  return {
    id: unpadId(node.id),
    details: node.details,
    type: node.type,
    ownerId: node.ownerId,
    createdAt: new Date(`${node.createdEvent.block.datetime}Z`),
  };
}

export const getPortfolioParty = (party: RawPortfolio): Portfolio => ({
  id: party.identityId,
  number: party.number,
  name: (party.number as unknown as number) === 0 ? 'Default' : party.name,
});

export function portfolioMovementNodeToPortfolioMovement(
  node: PortfolioMovementNode,
): PortfolioMovement {
  return {
    id: node.id,
    from: node.fromPortfolio
      ? getPortfolioParty(node.fromPortfolio)
      : undefined,
    fromAccount: node.fromAccountId || undefined,
    to: node.toPortfolio ? getPortfolioParty(node.toPortfolio) : undefined,
    toAccount: node.toAccountId || undefined,
    assetId: node.assetId,
    assetTicker: node.asset?.ticker,
    amount:
      (node.amount &&
        balanceToBigNumber(node.amount as unknown as Balance).toString()) ||
      undefined,
    nftIds: node.nftIds || undefined,
    address: node.address,
    memo: node.memo || undefined,
    createdAt: new Date(`${node.createdEvent.block.datetime}Z`),
    blockId: node.createdEvent.block.blockId.toString(),
  };
}

export function assetTransactionNodeToAssetTransaction(
  node: AssetTransactionNode,
): AssetTransaction {
  return {
    id: node.id,
    assetId: node.assetId,
    assetTicker: node.asset.ticker,
    fromAccount: node.fromAccountId || undefined,
    fromIdentityId: node.fromIdentityId || undefined,
    fromId: node.fromPortfolioId || undefined,
    from: node.fromPortfolio
      ? getPortfolioParty(node.fromPortfolio)
      : undefined,
    toAccount: node.toAccountId || undefined,
    toIdentityId: node.toIdentityId || undefined,
    toId: node.toPortfolioId || undefined,
    to: node.toPortfolio ? getPortfolioParty(node.toPortfolio) : undefined,
    amount:
      (node.amount &&
        balanceToBigNumber(node.amount as unknown as Balance).toString()) ||
      undefined,
    nftIds: node.nftIds || undefined,
    createdBlock: {
      blockId: node.createdEvent.block.blockId.toString(),
      datetime: new Date(`${node.createdEvent.block.datetime}Z`),
    },
    extrinsicIdx: node.createdEvent.extrinsicIdx ?? undefined,
    eventIdx: node.createdEvent.eventIdx,
    eventId: node.eventId,
    instructionId: node.instructionId ? unpadId(node.instructionId) : undefined,
    venueId: node.instruction?.venueId
      ? unpadId(node.instruction.venueId)
      : undefined,
    memo: node.instructionMemo || undefined,
  };
}

export function extrinsicNodeToExtrinsicTransaction(
  node: ExtrinsicNode,
): ExtrinsicTransaction {
  return {
    blockId: node.blockId,
    extrinsicIdx: node.extrinsicIdx,
    address: node.address,
    nonce: node.nonce,
    moduleId: node.moduleId,
    callId: node.callId,
    paramsTxt: node.paramsTxt,
    success: node.success,
    specVersionId: node.specVersionId,
    extrinsicHash: node.extrinsicHash,
    block: {
      hash: node.block.hash,
      datetime: new Date(`${node.block.datetime}Z`),
    },
  };
}

export function assetHolderNodeToAssetHolder(
  node: AssetHolderNode,
): AssetHolder {
  return {
    identityDid: node.identityId,
    balance:
      node.amount &&
      balanceToBigNumber(node.amount as unknown as Balance).toString(),
  };
}
