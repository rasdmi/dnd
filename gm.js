// gm.js
// GM response: local stub by default, optional external endpoint.
import { GM_ENDPOINT } from "./config.js";

function hash(str){
  let h = 0;
  for (let i=0;i<str.length;i++){
    h = ((h<<5)-h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function localGM({ lobby, players, playerInputs, turnIndex }){
  const names = players.map(p=>p.name || "игрок").join(", ");
  const seed = (lobby?.seed || "oak") + ":" + turnIndex;
  const scene = [
    "туманная опушка у старого тракта",
    "подземный зал с рунами и капающей водой",
    "рынок в городе у реки, где шепчутся торговцы",
    "обрыв над морем и каменный маяк",
    "заброшенная башня с лестницами и верёвками"
  ][Math.abs(hash(seed)) % 5];

  const hook = [
    "в воздухе пахнет озоном, будто рядом магия",
    "кто-то оставил свежие следы — но не человеческие",
    "вдали слышны барабаны и редкие крики",
    "на земле лежит странный жетон с символом короны",
    "по стенам идут тени, хотя источника света нет"
  ][Math.abs(hash(seed + ":h")) % 5];

  const recap = playerInputs.length
    ? "Ходы игроков: " + playerInputs.map(x=>`${x.playerName}: ${x.text}`).join(" | ")
    : "Пока никто не сделал ход.";

  return `🌲 Сцена ${turnIndex+1}\n${scene}. ${hook}.\n\n${recap}\n\nЧто происходит дальше:\nМир реагирует на ваши решения: где-то рядом уже движется тот, кто вас заметил.\n\nВарианты:\n1) Исследовать ближайшую деталь (следы/жетон/руны).\n2) Пойти на контакт (крикнуть, выманить, договориться).\n3) Сменить позицию (обход, укрытие, подготовка).\n\nНапишите действия и нажмите “Готово”.`;
}

export async function gmTurn(payload){
  if (!GM_ENDPOINT){
    return { ok:true, text: localGM(payload) };
  }
  const r = await fetch(GM_ENDPOINT, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) return { ok:false, error: data?.error || "gm endpoint error" };
  return { ok:true, text: data.text || "" };
}
