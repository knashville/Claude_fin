// Teller.io API client
// Docs: https://teller.io/docs

const TELLER_API_BASE = "https://api.teller.io";

interface TellerRequestOptions {
  path: string;
  accessToken: string;
  method?: string;
}

async function tellerRequest<T>({ path, accessToken, method = "GET" }: TellerRequestOptions): Promise<T> {
  const url = `${TELLER_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, { method, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Teller API error (${res.status}): ${text}`);
  }

  return res.json();
}

export interface TellerAccount {
  id: string;
  name: string;
  type: string; // depository, credit
  subtype: string; // checking, savings, credit_card
  institution: { id: string; name: string };
  currency: string;
  enrollment_id: string;
  status: string;
}

export interface TellerBalance {
  account_id: string;
  available: string;
  ledger: string;
}

export interface TellerTransaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: string; // negative = debit, positive = credit
  status: string; // posted, pending
  type: string;
  category: string;
  merchant_name: string | null;
  running_balance: string | null;
}

export async function getAccounts(accessToken: string): Promise<TellerAccount[]> {
  return tellerRequest({ path: "/accounts", accessToken });
}

export async function getAccountBalances(accessToken: string, accountId: string): Promise<TellerBalance> {
  return tellerRequest({ path: `/accounts/${accountId}/balances`, accessToken });
}

export async function getTransactions(accessToken: string, accountId: string): Promise<TellerTransaction[]> {
  return tellerRequest({ path: `/accounts/${accountId}/transactions`, accessToken });
}

// Application ID for Teller Connect
export function getTellerAppId(): string {
  return process.env.TELLER_APP_ID || "";
}

export function getTellerEnvironment(): string {
  return process.env.TELLER_ENV || "sandbox";
}
