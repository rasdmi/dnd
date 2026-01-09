// character-builder.js
import { db } from "./firebase-config.js";
import { qs, escapeHtml } from "./utils.js";
import { user } from "./auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const RACES = ["человек","эльф","дварф","хоббит","орк","тифлинг","гном","драконорожденный"];
const CLASSES = ["воин","лучник","маг","жрец","вор","бард","паладин","следопыт"];
const BACKGROUNDS = ["благородный","наёмник","учёный","фермер","охотник","путешественник","ремесленник","беглец"];

function chips(list){
  return list.map(x=>`<button class="chip" data-v="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("");
}

export function mountBuilder(lobbyId){
  const u = user();
  if (!u) return;

  qs("#rChips").innerHTML = chips(RACES);
  qs("#cChips").innerHTML = chips(CLASSES);
  qs("#bChips").innerHTML = chips(BACKGROUNDS);

  function bindChips(rootSel, inputSel){
    const root = qs(rootSel);
    const inp = qs(inputSel);
    root.addEventListener("click", (e)=>{
      const btn = e.target.closest("button.chip");
      if (!btn) return;
      inp.value = btn.dataset.v;
    });
  }
  bindChips("#rChips", "#race");
  bindChips("#cChips", "#klass");
  bindChips("#bChips", "#bg");

  qs("#saveCharBtn").onclick = async ()=>{
    const data = {
      name: qs("#charName").value.trim(),
      race: qs("#race").value.trim(),
      klass: qs("#klass").value.trim(),
      background: qs("#bg").value.trim(),
      notes: qs("#charNotes").value.trim(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "lobbies", lobbyId, "players", u.uid), {
      character: data
    }, { merge:true });
    alert("Персонаж сохранён для этого лобби.");
  };
}
