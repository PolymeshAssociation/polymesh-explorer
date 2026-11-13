import { Balance } from '@polkadot/types/interfaces';
import {
  InstructionStatus,
  InstructionStatusEnum,
} from '@polymeshassociation/polymesh-sdk/types';
import { balanceToBigNumber } from '@polymeshassociation/polymesh-sdk/utils/conversion';
import {
  SettlementInstructionWithEvents,
  SettlementLeg,
} from '@/domain/entities/SettlementInstruction';
import { unpadId } from '../repositories/paddedIds';
import {
  EventStamp,
  RawAffirmationNode,
  RawBlock,
  RawInstructionNode,
  RawLegNode,
} from '../repositories/types';

export function statusEnumToInstructionStatus(
  instruction: InstructionStatusEnum,
): InstructionStatus {
  if (instruction === 'Failed') {
    return InstructionStatus.Failed;
  }

  if (instruction === 'Rejected') {
    return InstructionStatus.Rejected;
  }

  if (instruction === 'Executed') {
    return InstructionStatus.Success;
  }

  return InstructionStatus.Pending;
}

const portfolioNumber = (portfolioId: string | null): number | undefined =>
  portfolioId ? Number(portfolioId.split('/')[1]) : undefined;

const toRawBlock = ({ block }: EventStamp): RawBlock => ({
  id: block.blockId.toString(),
  blockId: block.blockId,
  datetime: block.datetime,
  hash: block.hash,
});

export function rawLegToSettlementLeg(leg: RawLegNode): SettlementLeg {
  return {
    index: leg.legIndex,
    fromPortfolio: portfolioNumber(leg.fromPortfolioId),
    from: leg.fromId ?? undefined,
    fromAccount: leg.fromAccountId ?? undefined,
    toPortfolio: portfolioNumber(leg.toPortfolioId),
    to: leg.toId ?? undefined,
    toAccount: leg.toAccountId ?? undefined,
    // An off-chain leg has no asset id and names its asset by ticker
    assetId: leg.assetId ?? leg.ticker ?? '',
    assetTicker: leg.ticker ?? undefined,
    amount: leg.amount
      ? balanceToBigNumber(leg.amount as unknown as Balance).toString()
      : leg.amount,
    nftIds: leg.nftIds,
    legType: leg.legType,
  };
}

// The identities that have affirmed every one of their holdings on the
// instruction. Mediators are not counted.
function countAffirmedIdentities(affirmations: RawAffirmationNode[]): number {
  const statusByIdentity = new Map<string, boolean>();
  affirmations
    .filter((affirmation) => !affirmation.isMediator)
    .forEach(({ identityId, status }) =>
      statusByIdentity.set(
        identityId,
        (statusByIdentity.get(identityId) ?? true) && status === 'Affirmed',
      ),
    );

  return Array.from(statusByIdentity.values()).filter(Boolean).length;
}

export function rawInstructiontoSettlementInstruction(
  rawInstruction: RawInstructionNode,
): SettlementInstructionWithEvents {
  const uniqueCounterparties = new Set(
    rawInstruction.legs.nodes.flatMap((leg) =>
      [leg.fromId, leg.toId].filter((party): party is string => Boolean(party)),
    ),
  );

  return {
    id: unpadId(rawInstruction.id),
    venueId: rawInstruction.venue && unpadId(rawInstruction.venue.id),
    venueDescription: rawInstruction.venue?.details,
    status: statusEnumToInstructionStatus(rawInstruction.status),
    memo: rawInstruction.memo,
    createdAt: new Date(`${rawInstruction.createdEvent.block.datetime}Z`),
    updatedAt: new Date(`${rawInstruction.updatedEvent.block.datetime}Z`),
    counterparties: uniqueCounterparties.size,
    affirmedBy: countAffirmedIdentities(rawInstruction.affirmations.nodes),
    settlementType: rawInstruction.type,
    legs: rawInstruction.legs.nodes.map(rawLegToSettlementLeg),
    isExecuted: rawInstruction.status !== 'Created',
    events: rawInstruction.events.nodes.map((event) => ({
      id: event.id,
      event: event.event,
      eventIdx: event.createdEvent.eventIdx,
      createdBlock: toRawBlock(event.createdEvent),
    })),
    affirmations: rawInstruction.affirmations.nodes.map((affirmation) => ({
      ...affirmation,
      affirmedAt:
        affirmation.status === 'Affirmed' && affirmation.updatedEvent
          ? new Date(`${affirmation.updatedEvent.block.datetime}Z`)
          : undefined,
    })),
    createdBlock: toRawBlock(rawInstruction.createdEvent),
    createdEvent: {
      id: rawInstruction.createdEvent.id,
      eventId: rawInstruction.createdEvent.eventId,
      eventIdx: rawInstruction.createdEvent.eventIdx,
    },
  };
}
