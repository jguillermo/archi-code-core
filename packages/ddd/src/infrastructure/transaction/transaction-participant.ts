export interface TransactionParticipant {
  snapshot(): () => void;
}
