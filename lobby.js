// lobby.js
import { db } from "./firebase-config.js";
import { qs, escapeHtml, formatDate } from "./utils.js";
import { user } from "./auth.js";
import {
  collection, addDoc, doc, getDoc, setDoc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export function mountLobbyList(){
  const list = qs("#lobbyList");
  const btnCreate = qs("#createLobbyBtn");

  const modal = qs("#createLobbyModal");
  const cName = qs("#cName");
  const cPass = qs("#cPass");
  const cMax = qs("#cMax");
  const cTurns = qs("#cTurns");
  const cCancel = qs("#cCancel");
  const cCreate = qs("#cCreate");

  const joinModal = qs("#joinLobbyModal");
  const jName = qs("#jName");
  const jPass = qs("#jPass");
  const jCancel = qs("#jCancel");
  const jJoin = qs("#jJoin");

  let pendingJoinId = null;

  function openCreate(){ modal.classList.add("is-open"); setTimeout(()=>cName.focus(),20); }
  function closeCreate(){ modal.classList.remove("is-open"); }
  btnCreate.onclick = openCreate;
  cCancel.onclick = closeCreate;
  modal.addEventListener("click",(e)=>{ if(e.target===modal) closeCreate(); });

  function openJoin(lobbyId, lobbyName){
    pendingJoinId = lobbyId;
    joinModal.classList.add("is-open");
    jName.value = (user()?.displayName || "").split(" ")[0] || "";
    jPass.value = "";
    qs("#joinTitle").textContent = "Войти: " + lobbyName;
    setTimeout(()=>jName.focus(),20);
  }
  function closeJoin(){ joinModal.classList.remove("is-open"); pendingJoinId=null; }
  jCancel.onclick = closeJoin;
  joinModal.addEventListener("click",(e)=>{ if(e.target===joinModal) closeJoin(); });

  cCreate.onclick = async ()=>{
    const u = user();
    if (!u) return alert("Нужно войти");
    const name = cName.value.trim() || "Лобби";
    const pass = cPass.value.trim();
    const maxPlayers = parseInt(cMax.value||"4",10) || 4;
    const gmTurnsLimit = parseInt(cTurns.value||"12",10) || 12;

    const docRef = await addDoc(collection(db, "lobbies"), {
      name,
      pass: pass || "",
      maxPlayers,
      gmTurnsLimit,
      status: "waiting",
      hostUid: u.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      seed: Math.random().toString(36).slice(2,8),
      turnIndex: 0
    });

    await setDoc(doc(db, "lobbies", docRef.id, "players", u.uid), {
      uid: u.uid,
      name: (u.displayName||"host").split(" ")[0],
      role: "host",
      ready: false,
      createdAt: serverTimestamp()
    });

    closeCreate();
    location.hash = "#/lobby/" + docRef.id;
  };

  jJoin.onclick = async ()=>{
    const u = user();
    if (!u) return alert("Нужно войти");
    const name = jName.value.trim() || "Игрок";
    const pass = jPass.value.trim();
    if (!pendingJoinId) return;

    const lobbyRef = doc(db, "lobbies", pendingJoinId);
    const snap = await getDoc(lobbyRef);
    if (!snap.exists()) return alert("Лобби не найдено");
    const lobby = snap.data();
    if ((lobby.pass||"") !== (pass||"")) return alert("Неверный пароль");

    await setDoc(doc(db, "lobbies", pendingJoinId, "players", u.uid), {
      uid: u.uid,
      name,
      role: "player",
      ready: false,
      createdAt: serverTimestamp()
    }, { merge:true });

    closeJoin();
    location.hash = "#/lobby/" + pendingJoinId;
  };

  const q = query(collection(db, "lobbies"), orderBy("createdAt","desc"));
  const unsub = onSnapshot(q, (snap)=>{
    list.innerHTML = "";
    if (snap.empty){
      list.innerHTML = `<div class="muted">Пока нет лобби. Создай первое.</div>`;
      return;
    }
    snap.forEach(d=>{
      const l = d.data();
      const item = document.createElement("div");
      item.className = "lobbyCard";
      item.innerHTML = `
        <div class="lobbyTop">
          <div>
            <div class="lobbyName">${escapeHtml(l.name||"")}</div>
            <div class="muted mini">создано: ${escapeHtml(formatDate(l.createdAt)||"")}</div>
          </div>
          <div class="pill mini">${escapeHtml(l.status||"")}</div>
        </div>
        <div class="muted mini">игроков: ≤ ${escapeHtml(String(l.maxPlayers||4))} • лимит GM: ${escapeHtml(String(l.gmTurnsLimit||12))}</div>
        <div class="row" style="margin-top:10px; justify-content:flex-end;">
          <button class="btn ghost">войти</button>
        </div>
      `;
      item.querySelector("button").onclick = ()=>openJoin(d.id, l.name||"Лобби");
      list.appendChild(item);
    });
  });

  return ()=>unsub();
}
