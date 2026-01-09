// room.js
import { db } from "./firebase-config.js";
import { qs, escapeHtml, formatDate } from "./utils.js";
import { user } from "./auth.js";
import { gmTurn } from "./gm.js";
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, orderBy, onSnapshot, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let unsubLobby=null, unsubPlayers=null, unsubMsgs=null;

export async function mountRoom(lobbyId){
  const u = user();
  if (!u) return;

  const lobbyRef = doc(db, "lobbies", lobbyId);

  qs("#leaveBtn").onclick = async ()=>{
    if (!confirm("Выйти из лобби?")) return;
    await deleteDoc(doc(db, "lobbies", lobbyId, "players", u.uid));
    location.hash = "#/";
  };
  qs("#sendBtn").onclick = ()=>sendMsg(lobbyId);
  qs("#msgInput").addEventListener("keydown", (e)=>{
    if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) sendMsg(lobbyId);
  });

  qs("#readyBtn").onclick = async ()=>{
    const pRef = doc(db, "lobbies", lobbyId, "players", u.uid);
    const snap = await getDoc(pRef);
    const p = snap.data() || {};
    await updateDoc(pRef, { ready: !p.ready, updatedAt: serverTimestamp() });
  };

  qs("#gmTurnBtn").onclick = async ()=>{ await doGMTurn(lobbyId); };
  qs("#saveBtn").onclick = async ()=>{ await saveTranscript(lobbyId); };

  // ensure player exists
  const myRef = doc(db, "lobbies", lobbyId, "players", u.uid);
  const mySnap = await getDoc(myRef);
  if (!mySnap.exists()){
    await setDoc(myRef, {
      uid:u.uid,
      name:(u.displayName||"Игрок").split(" ")[0],
      role:"player",
      ready:false,
      createdAt: serverTimestamp()
    }, { merge:true });
  }

  // lobby
  if (unsubLobby) unsubLobby();
  unsubLobby = onSnapshot(lobbyRef, (snap)=>{
    if (!snap.exists()){
      alert("Лобби удалено");
      location.hash="#/";
      return;
    }
    const l = snap.data();
    qs("#roomTitle").textContent = l.name || "Лобби";
    qs("#roomMeta").textContent = `Статус: ${l.status||"waiting"} • лимит GM: ${l.gmTurnsLimit||12}`;
  });

  // players
  if (unsubPlayers) unsubPlayers();
  unsubPlayers = onSnapshot(query(collection(db,"lobbies",lobbyId,"players"), orderBy("createdAt","asc")), (snap)=>{
    const box = qs("#players");
    box.innerHTML="";
    snap.forEach(d=>{
      const p = d.data();
      const row = document.createElement("div");
      row.className="playerRow";
      row.innerHTML = `
        <div><b>${escapeHtml(p.name||"")}</b> <span class="muted mini">(${escapeHtml(p.role||"player")})</span></div>
        <div class="pill mini">${p.ready ? "готов" : "…"}</div>
      `;
      box.appendChild(row);
    });
  });

  // messages
  if (unsubMsgs) unsubMsgs();
  unsubMsgs = onSnapshot(query(collection(db,"lobbies",lobbyId,"messages"), orderBy("createdAt","asc")), (snap)=>{
    const box = qs("#chat");
    box.innerHTML="";
    snap.forEach(d=>{
      const m = d.data();
      const div = document.createElement("div");
      div.className="msg";
      div.innerHTML = `
        <div class="msgTop">
          <b>${escapeHtml(m.authorName||"")}</b>
          <span class="muted mini">${escapeHtml(formatDate(m.createdAt)||"")}</span>
        </div>
        <div class="msgText">${escapeHtml(m.text||"")}</div>
      `;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });

  // start button
  qs("#startBtn").onclick = async ()=>{
    const l = (await getDoc(lobbyRef)).data();
    if (l.hostUid !== u.uid) return alert("Стартовать может только хост.");
    await updateDoc(lobbyRef, { status:"running", updatedAt: serverTimestamp() });
    await addDoc(collection(db,"lobbies",lobbyId,"messages"), {
      authorUid:"gm",
      authorName:"GM",
      text:"Игра началась. Напишите первые действия и нажмите Готово.",
      createdAt: serverTimestamp(),
      type:"gm"
    });
  };
}

async function sendMsg(lobbyId){
  const u = user();
  const t = qs("#msgInput").value.trim();
  if (!t) return;
  qs("#msgInput").value="";
  await addDoc(collection(db,"lobbies",lobbyId,"messages"), {
    authorUid:u.uid,
    authorName:(u.displayName||"Игрок").split(" ")[0],
    text:t,
    createdAt: serverTimestamp(),
    type:"player"
  });
}

async function doGMTurn(lobbyId){
  const u = user();
  const lobbyRef = doc(db,"lobbies",lobbyId);
  const lSnap = await getDoc(lobbyRef);
  if (!lSnap.exists()) return;
  const lobby = lSnap.data();
  if (lobby.hostUid !== u.uid) return alert("GM Turn жмёт хост (MVP).");

  const playersSnap = await getDocs(collection(db,"lobbies",lobbyId,"players"));
  const players=[];
  let allReady=true;
  playersSnap.forEach(d=>{
    const p=d.data(); players.push(p);
    if (!p.ready) allReady=false;
  });
  if (!players.length) return alert("Нет игроков.");
  if (!allReady) return alert("Не все нажали Готово.");

  const msgsSnap = await getDocs(query(collection(db,"lobbies",lobbyId,"messages"), orderBy("createdAt","asc")));
  const msgs=[]; msgsSnap.forEach(d=>msgs.push(d.data()));
  const playerInputs = msgs.filter(m=>m.type==="player").slice(-players.length).map(m=>({playerName:m.authorName,text:m.text}));

  const turnIndex = lobby.turnIndex || 0;
  const gmLimit = lobby.gmTurnsLimit || 12;
  if (turnIndex >= gmLimit){
    await addDoc(collection(db,"lobbies",lobbyId,"messages"), {
      authorUid:"gm", authorName:"GM",
      text:"Сессия завершена по лимиту ходов GM. Нажмите “Сохранить” если хотите сохранить лог.",
      createdAt: serverTimestamp(),
      type:"gm"
    });
    await updateDoc(lobbyRef, { status:"finished", updatedAt: serverTimestamp() });
    return;
  }

  const res = await gmTurn({ lobby, players, playerInputs, turnIndex });
  if (!res.ok) return alert("GM error: " + (res.error||""));

  await addDoc(collection(db,"lobbies",lobbyId,"messages"), {
    authorUid:"gm", authorName:"GM",
    text: res.text,
    createdAt: serverTimestamp(),
    type:"gm"
  });

  await Promise.all(players.map(p=>updateDoc(doc(db,"lobbies",lobbyId,"players",p.uid), { ready:false, updatedAt: serverTimestamp() })));
  await updateDoc(lobbyRef, { turnIndex: turnIndex + 1, updatedAt: serverTimestamp() });
}

async function saveTranscript(lobbyId){
  const u = user();
  const lobby = (await getDoc(doc(db,"lobbies",lobbyId))).data() || {};
  const msgsSnap = await getDocs(query(collection(db,"lobbies",lobbyId,"messages"), orderBy("createdAt","asc")));
  const lines=[];
  msgsSnap.forEach(d=>{
    const m=d.data();
    lines.push(`${m.authorName}: ${m.text}`);
  });
  const transcript = lines.join("\n\n");
  const title = prompt("Название сохранения", lobby.name ? `Игра: ${lobby.name}` : "Игра");
  if (!title) return;

  await addDoc(collection(db,"users",u.uid,"savedGames"), {
    title, lobbyId, transcript, createdAt: serverTimestamp()
  });
  alert("Сохранено в Saved.");
}
