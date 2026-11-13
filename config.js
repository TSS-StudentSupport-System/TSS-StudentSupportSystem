/* TSS CareSpace — the only file to edit after uploading.
   apiUrl = the Web app URL of the Apps Script project (Deploy → Manage deployments → Web app URL, ends with /exec). */
window.TSS_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxUaTIBUADeiJHnvyDli3YZgAcsN2ET7WSGnxw7X0qbcag0S_GxbGLRdPw1Eig9FcgLPA/exec',
     edgeUrl: 'https://folsyyeoruqzkopistog.supabase.co/functions/v1/tss-api',
  gasFallback: true,
  loaderVideoUrl: new URL('assets/loader.mp4', document.baseURI).href
};
