// Teller.io API client
// Docs: https://teller.io/docs

import https from "https";
import fs from "fs";

const TELLER_API_BASE = "https://api.teller.io";

let cachedAgent: https.Agent | null = null;

function getTlsAgent(): https.Agent | undefined {
  if (cachedAgent) return cachedAgent;

  const certPath = process.env.TELLER_CERT_PATH;
  const keyPath = process.env.TELLER_KEY_PATH;

  if (!certPath || !keyPath) return undefined;

  try {
    cachedAgent = new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    });
    return cachedAgent;
  } catch (e) {
    console.warn("Teller mTLS certs not found:", e);
    return undefined;
  }
}

interface TellerRequestOptions {
  path: string;
  accessToken: string;
  method?: string;
}

function tellerRequest<T>({ path, accessToken, method = "GET" }: TellerRequestOptions): Promise<T> {
  const url = new URL(path, TELLER_API_BASE);
  const auth = Buffer.from(`${accessToken}:`).toString("base64");
  const agent = getTlsAgent();

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    };

    if (agent) {
      options.agent = agent;
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Teller API error (${res.statusCode}): ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error(`Teller API: invalid JSON response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
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

export function getTellerAppId(): string {
  return process.env.TELLER_APP_ID || "";
}

export function getTellerEnvironment(): string {
  return process.env.TELLER_ENV || "sandbox";
}
