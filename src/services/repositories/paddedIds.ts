// Instruction, venue and block ids are the chain's number zero-padded to 10 digits,
// so they sort as text. Lookups must use the padded form.
const PADDED_ID_LENGTH = 10;

export const padId = (id: string): string => id.padStart(PADDED_ID_LENGTH, '0');

export const unpadId = (id: string): string => id.replace(/^0+(?=\d)/, '');
