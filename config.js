/* TSS CareSpace — the only file to edit after uploading.
   apiUrl = the Web app URL of the Apps Script project (Deploy → Manage deployments → Web app URL, ends with /exec). */
window.TSS_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/PASTE-YOUR-DEPLOYMENT-ID/exec',
  loaderVideoUrl: new URL('assets/loader.mp4', document.baseURI).href
};
