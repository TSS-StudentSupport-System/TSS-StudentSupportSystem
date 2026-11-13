/* TEST PAGE — Supabase DEV project only (TSS-StudentSupport-System-Dev). Not for real student data.
   edgeUrl is a public address, not a secret. gasFallback stays false here: Apps Script still uses Google Sheets. */
window.TSS_CONFIG = {
  apiUrl: '',
  edgeUrl: 'https://kfmtputjpsurfnhceqrh.supabase.co/functions/v1/tss-api',
  gasFallback: false,
  loaderVideoUrl: new URL('assets/loader.mp4', document.baseURI).href
};
