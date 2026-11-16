// Public connection settings only. Never put a database password, service_role,
// secret API key or OAuth client secret in this file.
export const config = Object.freeze({
  backend: 'supabase',
  // All shared invitations point to the official public deployment.
  publicSiteUrl: 'https://shd5n.github.io/pomomental/',
  supabaseUrl: 'https://ocdpuysymzqfagxmdyqe.supabase.co',
  supabasePublishableKey: 'sb_publishable_Rp3YtT1F5UgToqdEiDStXA_pA-Z7mp8',
  providers: { google: true },
  // Enable a provider here only after configuring it in your Supabase project.
});

