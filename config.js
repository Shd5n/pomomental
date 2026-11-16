// Public connection settings only. Never put a database password, service_role,
// secret API key, Google client secret, or Apple private key in this file.
export const config = Object.freeze({
  backend: 'supabase',
  // Empty means invitations use the current deployment origin automatically.
  // Empty means invitations use the current deployment origin automatically.
  publicSiteUrl: '',
  supabaseUrl: 'https://ocdpuysymzqfagxmdyqe.supabase.co',
  supabasePublishableKey: 'sb_publishable_Rp3YtT1F5UgToqdEiDStXA_pA-Z7mp8',
  providers: { google: false, apple: false },
  // Enable a provider here only after configuring it in your Supabase project.
});

