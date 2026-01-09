// app.js
import { watchAuth, login, logout, user } from "./auth.js";
import { qs } from "./utils.js";
import { mountLobbyList } from "./lobby.js";
import { mountRoom } from "./room.js";
import { mountBuilder } from "./character-builder.js";
import { mountSaved } from "./saved.js";

let unLobby=null, unSaved=null;

function show(view){
  document.querySelectorAll("[data-view]").forEach(v=>v.classList.remove("is-active"));
  qs(`[data-view="${view}"]`)?.classList.add("is-active");
}

function setUserUI(u){
  qs("#userEmail").textContent = u ? (u.email || "user") : "гость";
  qs("#loginBtn").style.display = u ? "none" : "";
  qs("#logoutBtn").style.display = u ? "" : "none";
}

qs("#loginBtn").onclick = ()=>login().catch(err=>alert(err.message));
qs("#logoutBtn").onclick = ()=>logout().catch(err=>alert(err.message));
qs("#homeBtn").onclick = ()=>location.hash="#/";
qs("#savedBtn").onclick = ()=>location.hash="#/saved";

async function route(){
  const h = location.hash || "#/";
  const u = user();

  if (h.startsWith("#/lobby/")){
    if (!u){ location.hash="#/"; alert("Нужно войти"); return; }
    show("room");
    const id = h.split("/")[2];
    await mountRoom(id);
    mountBuilder(id);
    return;
  }

  if (h.startsWith("#/saved")){
    if (!u){ location.hash="#/"; alert("Нужно войти"); return; }
    show("saved");
    if (unLobby){ unLobby(); unLobby=null; }
    if (!unSaved) unSaved = mountSaved();
    return;
  }

  show("home");
  if (unSaved){ unSaved(); unSaved=null; }
  if (unLobby){ unLobby(); unLobby=null; }

  if (u){
    unLobby = mountLobbyList();
  } else {
    qs("#lobbyList").innerHTML = `<div class="muted">Войди, чтобы видеть лобби.</div>`;
  }
}

watchAuth((u)=>{
  setUserUI(u);
  route();
});
window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", route);
