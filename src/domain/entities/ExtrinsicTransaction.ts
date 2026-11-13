export interface ExtrinsicTransaction {
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
    datetime: Date;
  };
}
