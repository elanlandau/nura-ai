import { OAuthAccount, TimeSlot } from '../types';
import { sendGmailMessage } from './gmail';

export async function sendMeetingProposal(
  account: OAuthAccount,
  params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
    proposedSlots: TimeSlot[];
  }
): Promise<string> {
  if (account.provider === 'google') {
    return sendGmailMessage(account, params);
  } else if (account.provider === 'microsoft') {
    throw new Error('Microsoft email sending not yet implemented');
  }
  throw new Error('Unsupported provider');
}
