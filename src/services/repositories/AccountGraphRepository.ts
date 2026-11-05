import { GraphQLClient, gql } from 'graphql-request';
import { Account } from '@/domain/entities/Account';

interface AccountNode {
  address: string;
  identityId: string | null;
  createdAt: string;
  identity: {
    primaryAccountId: string | null;
  } | null;
}

interface AccountResponse {
  accounts: {
    nodes: AccountNode[];
  };
}

interface AccountWithMultiSigResponse extends AccountResponse {
  // MultiSig rows whose own account is this one: at most one
  multiSigs: {
    totalCount: number;
  };
}

export class AccountGraphRepository {
  constructor(private client: GraphQLClient) {}

  async findByKey(key: string): Promise<Account | null> {
    const query = gql`
      query ($filter: AccountFilter!, $address: String!) {
        accounts(filter: $filter, first: 1) {
          nodes {
            address
            identityId
            identity {
              primaryAccountId
            }
          }
        }
        multiSigs(filter: { accountId: { equalTo: $address } }) {
          totalCount
        }
      }
    `;

    const variables = {
      filter: { address: { equalTo: key } },
      address: key,
    };

    const response = await this.client.request<AccountWithMultiSigResponse>(
      query,
      variables,
    );
    const accounts = response.accounts.nodes;

    if (accounts.length === 0) return null;

    const account = accounts[0];

    return {
      key: account.address,
      identityDid: account.identityId,
      isMultisig: response.multiSigs.totalCount > 0,
      identityRelationship:
        account.identity?.primaryAccountId === account.address
          ? 'Primary'
          : 'Secondary',
      isSmartContract: false,
    };
  }

  async existsByKey(key: string): Promise<boolean> {
    const query = gql`
      query ($filter: AccountFilter!) {
        accounts(filter: $filter, first: 1) {
          nodes {
            address
          }
        }
      }
    `;

    const variables = {
      filter: { address: { equalTo: key } },
    };

    const response = await this.client.request<AccountResponse>(
      query,
      variables,
    );
    const accounts = response.accounts.nodes;

    return accounts.length > 0;
  }
}
