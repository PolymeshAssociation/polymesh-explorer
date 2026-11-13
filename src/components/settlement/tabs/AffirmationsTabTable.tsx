import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { EmptyDash } from '@/components/shared/common/EmptyDash';
import { FormattedDate } from '@/components/shared/common/FormattedDateText';
import { AccountOrDidTextField } from '@/components/shared/fieldAttributes/AccountOrDidTextField';
import { SettlementInstructionWithEvents } from '@/domain/entities/SettlementInstruction';

interface AffirmationsTableProps {
  affirmations: SettlementInstructionWithEvents['affirmations'];
}

function renderHolder(
  affirmation: AffirmationsTableProps['affirmations'][number],
): React.ReactNode {
  if (affirmation.accountId) {
    return <AccountOrDidTextField value={affirmation.accountId} />;
  }
  if (affirmation.portfolioId) {
    return `Portfolio ${affirmation.portfolioId.split('/')[1]}`;
  }

  return <EmptyDash />;
}

export function AffirmationsTabTable({
  affirmations,
}: AffirmationsTableProps): React.ReactElement {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Identity</TableCell>
            <TableCell>Holder</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Auto Affirmed</TableCell>
            <TableCell>Is Mediator</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {affirmations.map((affirmation) => (
            <TableRow key={affirmation.id}>
              <TableCell>
                <AccountOrDidTextField
                  value={affirmation.identityId}
                  showIdenticon
                  isIdentity
                />
              </TableCell>
              <TableCell>{renderHolder(affirmation)}</TableCell>
              <TableCell>{affirmation.status}</TableCell>
              <TableCell>
                {affirmation.affirmedAt ? (
                  <FormattedDate date={affirmation.affirmedAt} />
                ) : (
                  <EmptyDash />
                )}
              </TableCell>
              <TableCell>
                {affirmation.isAutomaticallyAffirmed ? 'Yes' : 'No'}
              </TableCell>
              <TableCell>{affirmation.isMediator ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
