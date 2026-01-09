// utils.js
export function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function formatDate(ts){
  try{
    const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
    if (!d) return "";
    return d.toLocaleString();
  }catch{ return ""; }
}
