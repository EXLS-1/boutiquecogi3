export interface CinetPayInitPayload {
  apikey: string;
  site_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  description: string;
  customer_name?: string;
  customer_surname?: string;
  customer_email?: string;
  customer_phone_number?: string;
  notify_url: string;
  return_url: string;
  channels?: string;
}

export interface CinetPayInitResponse {
  code: string;
  message: string;
  data?: {
    payment_url?: string;
    payment_token?: string;
  };
}

export interface CinetPayWebhookBody {
  cpm_trans_id?: string;
  cpm_result?: string;
  cpm_amount?: string;
  cpm_currency?: string;
  cpm_custom?: string;
  cpm_trans_status?: string;
  signature?: string;
  transaction_id?: string;
  status?: string;
}
