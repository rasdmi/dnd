// saved.js
import { db } from "./firebase-config.js";
import { qs, escapeHtml, formatDate } from "./utils.js";
import { user } from "./auth.js";
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let unsub=null;

export function mountSaved(){
  const u = user();
  const list = qs("#savedList");
  if (!u) return;

  if (unsub) unsub();
  unsub = onSnapshot(query(collection(db,"users",u.uid,"savedGames"), orderBy("createdAt","desc")), (snap)=>{
    list.innerHTML="";
    if (snap.empty){
      list.innerHTML = `<div class="muted">Пока нет сохранений.</div>`;
      return;
    }
    snap.forEach(d=>{
      const s=d.data();
      const card=document.createElement("div");
      card.className="saveCard";
      card.innerHTML=`
        <div class="saveTop">
          <div>
            <div class="saveTitle">${escapeHtml(s.title||"")}</div>
            <div class="muted mini">${escapeHtml(formatDate(s.createdAt)||"")}</div>
          </div>
        </div>
        <textarea class="saveText" readonly>${escapeHtml(s.transcript||"")}</textarea>
      `;
      list.appendChild(card);
    });
  });

  return ()=>{ if(unsub) unsub(); unsub=null; };
}
