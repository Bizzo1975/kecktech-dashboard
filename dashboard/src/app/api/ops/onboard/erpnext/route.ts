import { NextRequest, NextResponse } from "next/server";

const LLDAP_URL = process.env.LLDAP_URL || "https://lldap.kecktech.net";
const LLDAP_ADMIN_USER = process.env.LLDAP_ADMIN_USER || "admin";
const LLDAP_ADMIN_PASS = process.env.LLDAP_ADMIN_PASS || "";

const CUSTOMERS_GROUP_NAME = "kecktech_customers";

async function getLldapToken(): Promise<string> {
  const res = await fetch(`${LLDAP_URL}/auth/simple/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: LLDAP_ADMIN_USER, password: LLDAP_ADMIN_PASS }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLDAP auth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.token as string;
}

async function gql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${LLDAP_URL}/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLDAP GraphQL error (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`LLDAP GraphQL: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`);
  }
  return json.data as T;
}

/** Resolve the numeric ID for the kecktech_customers group (creates it if missing). */
async function ensureCustomersGroup(token: string): Promise<string> {
  const data = await gql<{ groups: { id: string; displayName: string }[] }>(
    token,
    `query ListGroups { groups { id displayName } }`
  );
  const existing = data.groups.find(
    (g) => g.displayName.toLowerCase() === CUSTOMERS_GROUP_NAME.toLowerCase()
  );
  if (existing) return existing.id;

  // Group doesn't exist — create it
  const created = await gql<{ createGroup: { id: string } }>(token, `
    mutation CreateGroup($name: String!) {
      createGroup(name: $name) { id }
    }
  `, { name: CUSTOMERS_GROUP_NAME });
  return created.createGroup.id;
}

/** Return existing user by username, or null. */
async function findUser(token: string, username: string): Promise<{ id: string } | null> {
  const data = await gql<{ user: { id: string } | null }>(token, `
    query GetUser($id: String!) {
      user(userId: $id) { id }
    }
  `, { id: username });
  return data.user;
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, displayName, firstName, lastName, password } = await req.json() as {
      username: string;
      email: string;
      displayName: string;
      firstName: string;
      lastName: string;
      password: string;
    };

    if (!username || !email || !displayName || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = await getLldapToken();

    // Check if user already exists
    const existing = await findUser(token, username);
    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      // Create the user
      const created = await gql<{ createUser: { id: string } }>(token, `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(user: $input) { id }
        }
      `, {
        input: {
          id: username,
          email,
          displayName,
          firstName: firstName || displayName.split(" ")[0] || "",
          lastName: lastName || displayName.split(" ").slice(1).join(" ") || "",
        },
      });
      userId = created.createUser.id;

      // Set password
      await gql(token, `
        mutation SetPassword($username: String!, $password: String!) {
          resetUserPasswordWithToken: changeUserPassword(
            userId: $username,
            password: $password
          )
        }
      `, { username, password });
    }

    // Ensure group exists and get its ID
    const groupId = await ensureCustomersGroup(token);

    // Add user to kecktech_customers
    await gql(token, `
      mutation AddToGroup($userId: String!, $groupId: Int!) {
        addUserToGroup(userId: $userId, groupId: $groupId) { ok }
      }
    `, { userId, groupId: parseInt(groupId, 10) });

    return NextResponse.json({
      success: true,
      userId,
      alreadyExisted: !!existing,
      group: CUSTOMERS_GROUP_NAME,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
