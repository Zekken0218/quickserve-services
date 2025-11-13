// Lightweight local stub to replace Supabase client.
// This keeps the front-end working without a backend/database.
// The API implements the small subset of methods used by the app and
// returns empty results or no-op successes.

type Result<T> = Promise<{ data: T; error: any } | { data: T | null; error: any }>;

const makeFrom = (table: string) => {
  return {
    select: (/*query?: string, opts?: any*/) => {
      return Promise.resolve({ data: [], error: null });
    },
    maybeSingle: async () => ({ data: null, error: null }),
    insert: async (_rows: any[]) => ({ data: null, error: null }),
    delete: function () {
      return { eq: async (_col: string, _val: any) => ({ data: null, error: null }) };
    },
    eq: async (_col: string, _val: any) => ({ data: null, error: null }),
    // allow chaining: from(...).select(...).maybeSingle()
    from: makeFrom,
  } as any;
};

export const supabase = {
  from: (table: string) => makeFrom(table),
  // Minimal auth stub
  auth: {
    onAuthStateChange: (_cb: (event: string, session: any) => void) => {
      // Return an object shaped like the real client so code can unsubscribe
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async (_creds: any) => ({ data: null, error: null }),
    signUp: async (_opts: any) => ({ data: null, error: null }),
    signOut: async () => ({ data: null, error: null }),
  },
};

export default supabase;