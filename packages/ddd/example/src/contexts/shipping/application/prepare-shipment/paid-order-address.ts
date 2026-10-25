export interface PaidOrderAddress {
  recipient: { name: string; phone: string };
  street: string;
  city: string;
  postalCode: string;
  country: string;
}
