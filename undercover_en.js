// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: user-secret;
// ============================================================
//  UNDERCOVER — Scriptable Script (Shortcut-like)
//  Version: 1.1
//  Author: ~WolfGang_PRoxa~
//  Description: A script to manage your Undercover games, with role assignment, SMS sending, and score tracking.
//  Features: Game flow, victory conditions, 
//  elimination SMS, player leaderboard.
// ============================================================

// ─────────────────────────────────────────────
//  GLOBAL CONSTANTS AND DATA
// ─────────────────────────────────────────────

let DEBUG_MODE = false;

const FOLDER_NAME   = "Undercover";
const LISTS_FOLDER  = "lists";
const FILE_PLAYERS  = "players.json";
const FILE_CONFIG   = "config.json";
const LOGS_FOLDER   = "logs";
const APP_VERSION   = "1.1";
const LANG          = "en";
const REPO_RAW_URL  = "https://raw.githubusercontent.com/WolfGang-PRoxa/undercover-scriptable/main";
const EMBEDDED_KEY  = "__embedded";

// Built-in list: copy of lists/default_en.json, used offline or when the active list cannot be found.
const EMBEDDED_WORDS = [
  ["Cat", "Tiger", "Lion", "Panther"],
  ["Coca-Cola", "Pepsi", "Dr Pepper", "Sprite"],
  ["Football", "Rugby", "Soccer", "Basketball"],
  ["Chocolate", "Cocoa", "Coffee", "Tea"],
  ["Beach", "Pool", "Lake", "River"],
  ["Car", "Motorcycle", "Bicycle", "Scooter"],
  ["New York", "London", "Paris", "Tokyo"],
  ["Pizza", "Quiche", "Pie", "Pancake"],
  ["Guitar", "Violin", "Cello", "Bass"],
  ["Movie Theater", "Theater", "Concert", "Opera"],
  ["Shark", "Dolphin", "Whale", "Orca"],
  ["Apple", "Pear", "Peach", "Apricot"],
  ["Skiing", "Snowboarding", "Sledding", "Ice Skating"],
  ["Castle", "Manor", "Palace", "Villa"],
  ["Sun", "Moon", "Star", "Planet"],
  ["Red", "Blue", "Green", "Yellow"],
  ["Airplane", "Helicopter", "Hot Air Balloon", "Rocket"],
  ["Book", "Magazine", "Newspaper", "Comic"],
  ["Gold", "Silver", "Bronze", "Copper"],
  ["Dog", "Wolf", "Fox", "Coyote"],
  ["Table", "Chair", "Stool", "Bench"],
  ["Pen", "Pencil", "Marker", "Highlighter"],
  ["Jacket", "Coat", "Sweater", "Vest"],
  ["Boat", "Ship", "Sailboat", "Submarine"],
  ["Computer", "Tablet", "Smartphone", "Console"],
  ["Piano", "Keyboard", "Organ", "Synthesizer"],
  ["Bakery", "Pastry Shop", "Butcher", "Grocery Store"],
  ["Pine", "Oak", "Birch", "Maple"],
  ["Cake", "Cookie", "Muffin", "Brownie"],
  ["Mountain", "Hill", "Valley", "Plateau"],
  ["Ice Cream", "Sorbet", "Gelato", "Slushie"],
  ["Pants", "Shorts", "Jeans", "Sweatpants"],
  ["Beer", "Wine", "Cider", "Champagne"],
  ["Train", "Subway", "Tram", "Bus"],
  ["Eagle", "Falcon", "Owl", "Hawk"],
  ["Banana", "Orange", "Tangerine", "Grapefruit"],
  ["Glasses", "Contacts", "Binoculars", "Microscope"],
  ["Shower", "Bath", "Jacuzzi", "Sauna"],
  ["Earth", "Mars", "Venus", "Jupiter"],
  ["Sea", "Ocean", "Lagoon", "Bay"],
  ["Strawberry", "Raspberry", "Blueberry", "Blackberry"],
  ["Bedroom", "Living Room", "Kitchen", "Bathroom"],
  ["Winter", "Summer", "Spring", "Autumn"],
  ["Horse", "Pony", "Donkey", "Mule"],
  ["Giraffe", "Zebra", "Elephant", "Hippopotamus"],
  ["Knife", "Fork", "Spoon", "Spatula"],
  ["Spider", "Ant", "Bee", "Mosquito"],
  ["Sky", "Cloud", "Rain", "Snow"],
  ["Diamond", "Ruby", "Emerald", "Sapphire"],
  ["Firefighter", "Police Officer", "Doctor", "Nurse"]
];

let sessionConfig = {
  showRoleInMessage: false,
  showPseudoInMessage: false,
  activeListName: "default_en",
};

let appState = {
  view: "main",
  prevView: "main",
  players: [],
  contacts: null,
  contactQuery: "",
  selectedPlayerPhone: null,
  game: {
    selected: new Set(),
    nbInfil: -1,
    nbMW: 0,
    pair: null,
    assignments: [],
    alive: [],
    turnOrder: [],
    round: 1,
    method: "screen",
    status: "playing",
    winnerType: null,
    mrWhiteAssign: null
  }
};

// ─────────────────────────────────────────────
//  FILE MANAGEMENT & DATA
// ─────────────────────────────────────────────

function getFM() { try { return FileManager.iCloud(); } catch (e) { return FileManager.local(); } }
function rootPath() { return getFM().joinPath(getFM().documentsDirectory(), FOLDER_NAME); }
function listsPath() { return getFM().joinPath(rootPath(), LISTS_FOLDER); }
function logsPath() { return getFM().joinPath(rootPath(), LOGS_FOLDER); }
function listFilePath(listName) { return getFM().joinPath(listsPath(), listName + ".json"); }
function playersPath() { return getFM().joinPath(rootPath(), FILE_PLAYERS); }
function configPath() { return getFM().joinPath(rootPath(), FILE_CONFIG); }
function usedWordsPath(listName) { return getFM().joinPath(listsPath(), listName + "__used_words.json"); }

function ensureStorage() {
  const fm = getFM();
  if (!fm.fileExists(rootPath())) fm.createDirectory(rootPath(), true);
  if (!fm.fileExists(listsPath())) fm.createDirectory(listsPath(), true);
  if (!fm.fileExists(logsPath())) fm.createDirectory(logsPath(), true);
  if (!fm.fileExists(playersPath())) writeJSON(playersPath(), []);
  if (!fm.fileExists(configPath())) saveConfig();
}

// iCloud files may be evicted from the device: download them before any synchronous read.
async function prefetchStorage() {
  const fm = getFM();
  for (const dir of [rootPath(), listsPath(), logsPath()]) {
    let files = [];
    try { files = fm.listContents(dir); } catch (e) {}
    for (const f of files) {
      const path = fm.joinPath(dir, f);
      try { if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) await fm.downloadFileFromiCloud(path); } catch (e) {}
    }
  }
}

function writeJSON(path, data) { getFM().writeString(path, JSON.stringify(data, null, 2)); }
function readJSON(path, fallback) { try { return JSON.parse(getFM().readString(path)); } catch (e) { return fallback; } }

function saveConfig() { writeJSON(configPath(), { DEBUG_MODE, sessionConfig }); }

function loadConfig() {
  const data = readJSON(configPath(), {});
  if (data.DEBUG_MODE !== undefined) DEBUG_MODE = data.DEBUG_MODE;
  if (data.sessionConfig) sessionConfig = { ...sessionConfig, ...data.sessionConfig };
}

function loadPlayers() {
  const data = readJSON(playersPath(), []);
  return Array.isArray(data) ? data.map(p => {
    let r = p.roles || {};
    let nRole = (d) => {
      if (typeof d === 'number') return { played: d, won: 0, lost: 0 };
      if (typeof d === 'object' && d !== null) return { played: d.played || 0, won: d.won || 0, lost: d.lost || 0 };
      return { played: 0, won: 0, lost: 0 };
    };
    return {
      ...p,
      score: p.score || 0,
      roles: { civil: nRole(r.civil), infiltre: nRole(r.infiltre), mrwhite: nRole(r.mrwhite) }
    };
  }) : [];
}

function savePlayers() { writeJSON(playersPath(), appState.players); }

function addScore(phone, points) {
  let player = appState.players.find(p => p.phone === phone);
  if (player) {
    player.score = (player.score || 0) + points;
    savePlayers();
  }
}

// ─────────────────────────────────────────────
//  WORD LISTS
// ─────────────────────────────────────────────

function getAvailableLists() {
  const fm = getFM(), lp = listsPath(), names = [];
  try { fm.listContents(lp).forEach(f => { if (f.endsWith(".json") && !f.includes("__used_words")) names.push(f.replace(".json", "")); }); } catch (e) {}
  return names.sort();
}

// Normalizes a raw list into groups { id, words, fixed }.
// Accepted formats: [["Word A", "Word B", ...], ...] or [{ "civil": "...", "undercover": "..." }, ...]
function parseWordList(data) {
  if (!Array.isArray(data)) return [];
  const groups = [], seen = new Set();
  const add = (group) => { if (!seen.has(group.id)) { seen.add(group.id); groups.push(group); } };
  data.forEach(item => {
    if (Array.isArray(item)) {
      const words = [...new Set(item.filter(w => typeof w === "string").map(w => w.trim()).filter(w => w))];
      if (words.length >= 2) add({ id: [...words].sort().join("-"), words, fixed: false });
    } else if (item && typeof item.civil === "string" && typeof item.undercover === "string") {
      const civil = item.civil.trim(), undercover = item.undercover.trim();
      if (civil && undercover && civil !== undercover) add({ id: civil + "|" + undercover, words: [civil, undercover], fixed: true });
    }
  });
  return groups;
}

// Word pool of a list. If the list is missing or invalid, fall back to the embedded list.
function loadWordPool(listName) {
  if (listName) {
    const groups = parseWordList(readJSON(listFilePath(listName), null));
    if (groups.length > 0) return { key: listName, label: listName, groups, missing: false };
  }
  return { key: EMBEDDED_KEY, label: "Built-in list", groups: parseWordList(EMBEDDED_WORDS), missing: !!listName };
}

function loadUsedWords(key) {
  const data = readJSON(usedWordsPath(key), []);
  return Array.isArray(data) ? data : [];
}

function resetUsedWords(key) { writeJSON(usedWordsPath(key), []); }

// Whitelist: groups of the list that have not been played in any game yet.
function remainingGroups(pool) {
  const usedSet = new Set(loadUsedWords(pool.key).map(u => u.id || (u.civil + "|" + u.undercover)));
  return pool.groups.filter(g => !usedSet.has(g.id));
}

// Draws a group from the whitelist and removes it for the next games.
// Returns null when every group has already been played.
function pickPair(pool) {
  const remaining = remainingGroups(pool);
  if (remaining.length === 0) return null;

  const group = remaining[Math.floor(Math.random() * remaining.length)];
  const [civil, undercover] = group.fixed ? group.words : shuffle(group.words);

  const used = loadUsedWords(pool.key);
  used.push({ id: group.id, civil, undercover, date: new Date().toISOString() });
  writeJSON(usedWordsPath(pool.key), used);
  return { civil, undercover, words: group.words, listLabel: pool.label, remaining: remaining.length - 1, total: pool.groups.length };
}

// Downloads the official lists referenced in lists/index.json on the repository.
// Returns { downloaded, failed } or null if the repository cannot be reached.
async function syncRemoteLists() {
  const fetchText = async (url) => {
    const req = new Request(url);
    req.timeoutInterval = 10;
    const text = await req.loadString();
    if (req.response.statusCode !== 200) throw new Error("HTTP " + req.response.statusCode);
    return text;
  };

  let names;
  try {
    const index = JSON.parse(await fetchText(`${REPO_RAW_URL}/${LISTS_FOLDER}/index.json`));
    names = (index[LANG] || []).filter(n => /^[\w-]+$/.test(n));
  } catch (e) { return null; }

  const result = { downloaded: [], failed: [] };
  for (const name of names) {
    try {
      const text = await fetchText(`${REPO_RAW_URL}/${LISTS_FOLDER}/${name}.json`);
      if (parseWordList(JSON.parse(text)).length === 0) throw new Error("Empty list");
      getFM().writeString(listFilePath(name), text);
      result.downloaded.push(name);
    } catch (e) { result.failed.push(name); }
  }
  return result;
}

function listStatus(pool) {
  return `${remainingGroups(pool).length}/${pool.groups.length} groups left`;
}

// ─────────────────────────────────────────────
//  GAME LOGS
// ─────────────────────────────────────────────

// Each game produces a readable text file in Undercover/logs/,
// reachable from the Files app (see logsLocation()).

function pad2(n) { return String(n).padStart(2, "0"); }
function formatDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function storageLabel() { try { FileManager.iCloud(); return "iCloud Drive"; } catch (e) { return "On My iPhone"; } }
function logsLocation() { return `Files > ${storageLabel()} > Scriptable > ${FOLDER_NAME} > ${LOGS_FOLDER}`; }
function playerLabel(p) { return p.pseudo ? `${p.name} (${p.pseudo})` : p.name; }
function turnOrderLabel() {
  return appState.game.turnOrder.map(phone => playerLabel(appState.game.assignments.find(a => a.player.phone === phone).player)).join(", ");
}

function writeGameLog() {
  const log = appState.game.log;
  if (log) try { getFM().writeString(log.path, log.lines.join("\n") + "\n"); } catch (e) {}
}

function logEvent(text) {
  const log = appState.game.log;
  if (!log) return;
  log.lines.push(`[${formatDate(new Date()).slice(11)}] ${text}`);
  writeGameLog();
}

function startGameLog() {
  const g = appState.game, pair = g.pair, now = new Date();
  const methods = { sms: "SMS", screen: "On this screen", debug: "Debug mode (nothing sent)" };
  const lines = [
    "UNDERCOVER — Game log",
    `Date: ${formatDate(now)}`,
    `Version: ${APP_VERSION}`,
    `Word list: ${pair.listLabel} (${pair.remaining}/${pair.total} groups left after this draw)`,
    `Drawn group: ${pair.words.join(", ")}`,
    `Civilians' word: ${pair.civil}`,
    `Undercovers' word: ${pair.undercover}`,
    `Distribution: ${methods[g.method]}`,
    "",
    `Players (${g.assignments.length}):`,
    ...g.assignments.map(a => `  - ${playerLabel(a.player)} → ${a.role} [${a.word || "no word"}]`),
    "",
    "Timeline:",
  ];
  const stamp = formatDate(now).replace(" ", "_").replace(/:/g, "-");
  g.log = { path: getFM().joinPath(logsPath(), `game_${stamp}.txt`), lines };
  logEvent(`Round 1 — speaking order: ${turnOrderLabel()}`);
}

function endGameLog(text, summary = []) {
  const log = appState.game.log;
  if (!log) return;
  logEvent(text);
  log.lines.push(...summary);
  writeGameLog();
  appState.game.log = null;
}

function getGameLogs() {
  const fm = getFM();
  try { return fm.listContents(logsPath()).filter(f => f.endsWith(".txt")).sort().reverse(); } catch (e) { return []; }
}

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────

function normalizePhone(phone) {
  let p = String(phone).replace(/[\s\-\.\(\)]/g, "");
  if (p.startsWith("0") && p.length === 10) p = "+33" + p.slice(1);
  return p;
}
function isValidPhone(p) { return /^\+\d{8,15}$/.test(p); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pause(ms) { return new Promise(r => Timer.schedule(ms, false, r)); }

async function loadAllContactsWithPhone() {
  const allContainers = await ContactsContainer.all();
  let allContacts = [];
  for (const container of allContainers) {
    try { allContacts = allContacts.concat(await Contact.all([container])); } catch (e) {}
  }
  const seen = new Set();
  const contacts = allContacts.filter(c => {
    if (seen.has(c.identifier)) return false;
    seen.add(c.identifier);
    return true;
  });
  contacts.sort((a, b) => ((a.givenName||"")+" "+(a.familyName||"")).localeCompare((b.givenName||"")+" "+(b.familyName||"")));
  return contacts.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
}

// ─────────────────────────────────────────────
//  SPA UI ENGINE
// ─────────────────────────────────────────────

async function startApp() {
  return new Promise(async (resolve) => {
    let table = new UITable();
    table.showSeparators = true;
    
    function render() {
      table.removeAllRows();

      const addHeader = (title, subtitle) => {
        let row = new UITableRow();
        row.isHeader = true;
        row.height = 80;
        let cell = row.addText(title, subtitle || "");
        cell.titleFont = Font.boldSystemFont(30);
        if (subtitle) cell.subtitleFont = Font.systemFont(14);
        table.addRow(row);
      };

      const addRow = (icon, title, subtitle, color, onClick, dismiss = false, rightText = null) => {
        let row = new UITableRow();
        row.height = 55;
        row.dismissOnSelect = dismiss;
        let cell = row.addText(icon + " " + title, subtitle || "");
        cell.titleFont = Font.systemFont(18);
        if (subtitle) cell.subtitleFont = Font.systemFont(13);
        if (color) { cell.titleColor = color; cell.subtitleColor = color; }
        if (rightText) {
          let rCell = row.addText(rightText);
          rCell.rightAligned();
          rCell.titleColor = Color.orange();
          rCell.titleFont = Font.boldSystemFont(18);
        }
        if (onClick) row.onSelect = onClick;
        table.addRow(row);
        return row;
      };

      // ─────────────────────────────────────────────
      // VIEW : MAIN MENU
      if (appState.view === "main") {
        addHeader("🕵️ UNDERCOVER", `Scriptable Edition - v${APP_VERSION}`);
        addRow("🎮", "Start a game", "Configure and start", Color.blue(), () => { appState.view = "config"; render(); });
        addRow("👥", "Manage players", `${appState.players.length} registered`, null, () => { appState.view = "players"; render(); });
        addRow("🏆", "Leaderboard & Scores", "Player statistics", Color.orange(), () => { appState.view = "stats"; render(); });
        addRow("📖", "Game Rules", "How to play and win", null, () => { appState.view = "rules"; render(); });
        addRow("📜", "Game history", `${getGameLogs().length} game(s) recorded`, null, () => { appState.view = "logs"; render(); });
        addRow("⚙️", "Advanced settings", "Words, display...", null, () => { appState.prevView = "main"; appState.view = "advanced"; render(); });
        
        addRow("🐛", "Debug Mode", DEBUG_MODE ? "🟢 ON (Test)" : "⚪ OFF", DEBUG_MODE ? Color.orange() : Color.gray(), () => { DEBUG_MODE = !DEBUG_MODE; saveConfig(); render(); });
        addRow("❌", "Quit", "", Color.red(), () => resolve("quit"), true);
      }

      // ─────────────────────────────────────────────
      // VIEW : GAME RULES
      else if (appState.view === "rules") {
        addHeader("Game Rules", "How to play and win");
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = "main"; render(); });

        const addSection = (title, text) => {
          let rTitle = new UITableRow();
          rTitle.isHeader = true;
          let tCell = rTitle.addText(title);
          tCell.titleFont = Font.boldSystemFont(18);
          table.addRow(rTitle);

          const wrapText = (str, maxChars) => {
            const words = str.split(' ');
            let lines = [];
            let currentLine = "";
            words.forEach(word => {
              if ((currentLine + word).length > maxChars) {
                if (currentLine.length > 0) lines.push(currentLine.trim());
                currentLine = word + " ";
              } else {
                currentLine += word + " ";
              }
            });
            if (currentLine.trim().length > 0) lines.push(currentLine.trim());
            return lines;
          };

          let allLines = [];
          text.split('\n').forEach(p => {
            allLines = allLines.concat(wrapText(p, 42));
          });

          let rText = new UITableRow();
          let cText = rText.addText(allLines.join('\n'));
          cText.titleFont = Font.systemFont(15);
          cText.titleColor = Color.dynamic(Color.darkGray(), Color.lightGray());
          rText.height = Math.max(44, allLines.length * 20 + 10);
          table.addRow(rText);
        };

        addSection("Objective", "Each player receives a secret role. Civilians all receive the same word. Undercovers receive a similar but slightly different word. Mr. White receives no word.\nThe goal of the Civilians is to unmask the intruders. The goal of the imposters is to survive.");
        addSection("Turn Sequence", "1. Each player takes turns saying a word related to their secret word.\n2. Once all players have spoken, a debate begins to identify the intruder.\n3. After the debate, the group votes and eliminates one participant. Their role is then revealed.");
        addSection("Roles and Strategy", "Civilian: Find the intruders without using clues that are too obvious, which would help Mr. White.\nUndercover: Blend in with the crowd by deducing the general theme of the Civilians' word.\nMr. White: You have no word. Observe, bluff, and try to discover the Civilians' word.");
        addSection("Victory Conditions", "Civilians: They eliminate all Undercovers and Mr. White.\nUndercovers: They survive until only one Civilian remains.\nMr. White: He survives until the end, OR he is eliminated but manages to guess the exact word of the Civilians.");
      }

      // ─────────────────────────────────────────────
      // VIEW : GAME HISTORY
      else if (appState.view === "logs") {
        let logs = getGameLogs();
        addHeader("📜 History", `${logs.length} game(s) recorded`);
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = "main"; render(); });
        addRow("📂", "Logs location", logsLocation(), Color.gray());

        logs.slice(0, 50).forEach(f => {
          let content = "";
          try { content = getFM().readString(getFM().joinPath(logsPath(), f)); } catch (e) {}
          let result = (content.match(/^RESULT: (.*)$/m) || [])[1] || "Game not finished";
          let date = f.replace(/^game_/, "").replace(".txt", "").replace("_", " at ").replace(/-(\d\d)-(\d\d)$/, ":$1:$2");
          addRow("🗒️", date, result, null, async () => { await QuickLook.present(content, true); });
        });

        if (logs.length > 0) {
          addRow("🗑️", "Clear history", "Deletes every log", Color.red(), async () => {
            let a = new Alert(); a.title = "Clear history?"; a.message = `${logs.length} log(s) will be deleted.`;
            a.addDestructiveAction("Clear"); a.addCancelAction("Cancel");
            if (await a.presentAlert() === 0) { logs.forEach(f => getFM().remove(getFM().joinPath(logsPath(), f))); render(); }
          });
        }
      }

      // ─────────────────────────────────────────────
      // VIEW : LEADERBOARD
      else if (appState.view === "stats") {
        addHeader("🏆 Leaderboard", "Cumulative scores");
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = "main"; render(); });
        
        let sorted = [...appState.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (sorted.length === 0) addRow("ℹ️", "No players", "Add players to start.", Color.gray());
        
        sorted.forEach((p, idx) => {
          let med = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🔹";
          let pRoles = p.roles || { civil: {played:0, won:0, lost:0}, infiltre: {played:0, won:0, lost:0}, mrwhite: {played:0, won:0, lost:0} };
          let rolesStr = ` 🤠 ${pRoles.civil.played} | 🕵️ ${pRoles.infiltre.played} | 👻 ${pRoles.mrwhite.played}`;
          let sub = (p.pseudo ? `Nickname: ${p.pseudo}` : p.phone) + rolesStr;
          
          addRow(med, p.name, sub, null, () => {
            appState.selectedPlayerPhone = p.phone;
            appState.view = "player_stats";
            render();
          }, false, (p.score || 0) + " pts");
        });
      }

      // ─────────────────────────────────────────────
      // VIEW : PLAYER STATS
      else if (appState.view === "player_stats") {
        let p = appState.players.find(x => x.phone === appState.selectedPlayerPhone);
        if (!p) { appState.view = "stats"; render(); return; }
        
        let pRoles = p.roles || { civil: {played:0, won:0, lost:0}, infiltre: {played:0, won:0, lost:0}, mrwhite: {played:0, won:0, lost:0} };

        addHeader(`Manage ${p.name}`, `Global score : ${p.score || 0}`);
        addRow("◀", "Back to leaderboard", "", Color.blue(), () => { appState.view = "stats"; render(); });

        addRow("✏️", "Edit global score", "", null, async () => {
          let aScore = new Alert();
          aScore.title = "New score";
          aScore.addTextField("E.g., 10", String(p.score || 0));
          aScore.addAction("Save");
          aScore.addCancelAction("Cancel");
          if (await aScore.presentAlert() === 0) {
            let val = parseInt(aScore.textFieldValue(0));
            if (!isNaN(val)) { p.score = val; savePlayers(); render(); }
          }
        });

        let statsHeader = new UITableRow();
        statsHeader.isHeader = true; statsHeader.height = 40;
        let shCell = statsHeader.addText("Role statistics");
        shCell.titleFont = Font.boldSystemFont(20);
        table.addRow(statsHeader);

        const addRoleStatRow = (icon, roleName, roleKey) => {
           let rStats = pRoles[roleKey];
           let subtitle = `${rStats.played} played | ${rStats.won}W - ${rStats.lost}L`;
           addRow(icon, roleName, subtitle, null, async () => {
             let aEdit = new Alert();
             aEdit.title = `Stats: ${roleName}`;
             aEdit.addTextField("Played", String(rStats.played));
             aEdit.addTextField("Won", String(rStats.won));
             aEdit.addTextField("Lost", String(rStats.lost));
             aEdit.addAction("Save");
             aEdit.addCancelAction("Cancel");
             if (await aEdit.presentAlert() === 0) {
               rStats.played = parseInt(aEdit.textFieldValue(0)) || 0;
               rStats.won = parseInt(aEdit.textFieldValue(1)) || 0;
               rStats.lost = parseInt(aEdit.textFieldValue(2)) || 0;
               savePlayers(); render(); 
             }
           });
        };

        addRoleStatRow("🤠", "Civilians", "civil");
        addRoleStatRow("🕵️", "Undercovers", "infiltre");
        addRoleStatRow("👻", "Mr. White", "mrwhite");

        addRow("🗑️", "Reset all", "Resets score and stats to 0", Color.red(), async () => {
             let a = new Alert();
             a.title = "Reset " + p.name;
             a.message = "Do you want to reset the score and role statistics?";
             a.addDestructiveAction("Reset");
             a.addCancelAction("Cancel");
             if (await a.presentAlert() === 0) {
                p.score = 0;
                p.roles = { 
                  civil: {played:0, won:0, lost:0}, 
                  infiltre: {played:0, won:0, lost:0}, 
                  mrwhite: {played:0, won:0, lost:0} 
                };
                savePlayers(); render();
             }
        });
      }
      
      // ─────────────────────────────────────────────
      // VIEW : MANAGE PLAYERS
      else if (appState.view === "players") {
        addHeader("👥 Players", `${appState.players.length} player(s) ready`);
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = "main"; render(); });
        addRow("📇", "Import from Contacts", "", null, () => { appState.view = "contacts"; render(); });
        addRow("✏️", "Add manually", "", null, async () => {
          let a = new Alert(); a.title = "New player";
          a.addTextField("Name", ""); a.addTextField("Phone number (+1...)", "");
          a.addAction("Add"); a.addCancelAction("Cancel");
          if (await a.presentAlert() === 0) {
            let n = a.textFieldValue(0).trim();
            let p = normalizePhone(a.textFieldValue(1).trim());
            if (n && isValidPhone(p)) {
              if (!appState.players.some(x => x.phone === p)) { appState.players.push({name: n, phone: p, score: 0, roles: { civil: {played: 0, won: 0, lost: 0}, infiltre: {played: 0, won: 0, lost: 0}, mrwhite: {played: 0, won: 0, lost: 0} }}); savePlayers(); render(); }
            }
          }
        });
        
        appState.players.forEach((p, idx) => {
          let sub = p.phone + (p.pseudo ? `  •  Nickname: ${p.pseudo}` : "");
          addRow("👤", p.name, sub, null, async () => {
            let a = new Alert(); a.title = `Manage ${p.name}`;
            a.addAction(p.pseudo ? "Edit nickname" : "Add nickname");
            a.addDestructiveAction("Delete player"); a.addCancelAction("Cancel");
            let res = await a.presentAlert();
            if (res === 0) {
              let pAlert = new Alert(); pAlert.title = `Nickname`; pAlert.addTextField("Nickname", p.pseudo || "");
              pAlert.addAction("Save"); pAlert.addCancelAction("Cancel");
              if (await pAlert.presentAlert() === 0) {
                let val = pAlert.textFieldValue(0).trim();
                appState.players[idx].pseudo = val !== "" ? val : undefined; savePlayers(); render();
              }
            } else if (res === 1) {
              appState.players.splice(idx, 1); savePlayers(); render();
            }
          });
        });
      }

      // ─────────────────────────────────────────────
      // VIEW : IMPORT FROM CONTACTS
      else if (appState.view === "contacts") {
        addHeader("📇 Contacts", appState.contactQuery ? `Filter: "${appState.contactQuery}"` : "Search to filter");
        addRow("◀", "Back to players", "", Color.blue(), () => { appState.view = "players"; appState.contactQuery = ""; render(); });
        
        if (!appState.contacts) {
          addRow("⏳", "Loading address book...", "Please wait...", Color.gray());
          loadAllContactsWithPhone().then(c => { appState.contacts = c; render(); });
          table.reload(); return;
        }

        if (appState.contactQuery) {
          addRow("✖️", "Clear search", "", Color.orange(), () => { appState.contactQuery = ""; render(); });
        } else {
          addRow("🔍", "Search for a contact...", "Type a name", Color.blue(), async () => {
            let a = new Alert(); a.title = "Search"; a.addTextField("Name...", "");
            a.addAction("Filter"); a.addCancelAction("Cancel");
            if (await a.presentAlert() === 0) { appState.contactQuery = a.textFieldValue(0).trim(); render(); }
          });
        }

        let q = appState.contactQuery.toLowerCase();
        let filtered = appState.contacts.filter(c => ((c.givenName||'')+' '+(c.familyName||'')).toLowerCase().includes(q));

        filtered.forEach(c => {
          let cName = ((c.givenName||"")+" "+(c.familyName||"")).trim() || "(no name)";
          let phones = c.phoneNumbers.map(pn => normalizePhone(pn.value));
          let existingIdx = appState.players.findIndex(p => phones.includes(p.phone));

          if (existingIdx >= 0) {
            addRow("✅", cName, appState.players[existingIdx].phone, Color.green(), () => {
              appState.players.splice(existingIdx, 1);
              savePlayers(); render();
            });
          } else {
            addRow("➕", cName, c.phoneNumbers[0].value, null, async () => {
              let chosenPhone = phones[0];
              if (phones.length > 1) {
                let a = new Alert(); a.title = "Choose the number";
                c.phoneNumbers.forEach(pn => a.addAction(`${pn.label||"?"} : ${pn.value}`));
                a.addCancelAction("Cancel");
                let res = await a.presentAlert();
                if (res === -1) return;
                chosenPhone = phones[res];
              }
              appState.players.push({name: cName, phone: chosenPhone, score: 0, roles: { civil: {played: 0, won: 0, lost: 0}, infiltre: {played: 0, won: 0, lost: 0}, mrwhite: {played: 0, won: 0, lost: 0} }});
              savePlayers(); render();
            });
          }
        });
      }

      // ─────────────────────────────────────────────
      // VIEW : GAME CONFIGURATION
      else if (appState.view === "config") {
        let validPlayers = appState.players.filter(p => appState.game.selected.has(p.phone));
        let n = validPlayers.length;
        let effInfil = appState.game.nbInfil === -1 ? Math.ceil(n * 0.25) : appState.game.nbInfil;
        let effMW = appState.game.nbMW;
        let nbCivils = n - effInfil - effMW;
        let invalidReason = n < 3 ? "Select at least 3 players"
          : effInfil + effMW === 0 ? "At least 1 Undercover or Mr. White is required"
          : nbCivils < 2 ? "At least 2 Civilians are required"
          : null;
        let isValid = invalidReason === null;

        addHeader("New Game", `${n} selected | Civilians: ${Math.max(0, n - effInfil - effMW)} | Und: ${effInfil} | MW: ${effMW}`);
        addRow("◀", "Back to menu", "", Color.orange(), () => { appState.view = "main"; render(); });
        
        addRow("⚙️", "Game settings", "Edit words, nicknames...", null, () => {
          appState.prevView = "config"; appState.view = "advanced"; render();
        });

        addRow("🚀", "START GAME", isValid ? "Click to start" : invalidReason, isValid ? Color.blue() : Color.gray(), () => {
          if (isValid) resolve("launch");
        }, isValid);

        addRow("🕵️", `Undercovers : ${appState.game.nbInfil === -1 ? effInfil + " (Auto)" : effInfil}`, "Click to edit", null, async () => {
          let a = new Alert(); a.title = "Number of Undercovers"; a.addTextField("E.g., 1", String(effInfil));
          a.addAction("Force value"); a.addAction("Set to Auto"); a.addCancelAction("Cancel");
          let r = await a.presentAlert();
          if (r === 0) appState.game.nbInfil = Math.max(0, parseInt(a.textFieldValue(0)) || 0);
          else if (r === 1) appState.game.nbInfil = -1;
          render();
        });

        addRow("👻", `Mr. White : ${effMW}`, "Click to edit", null, async () => {
          let a = new Alert(); a.title = "Number of Mr. White"; a.addTextField("E.g., 0", String(effMW));
          a.addAction("Confirm"); a.addCancelAction("Cancel");
          if (await a.presentAlert() === 0) appState.game.nbMW = Math.max(0, parseInt(a.textFieldValue(0)) || 0);
          render();
        });

        appState.players.forEach(p => {
          let isSel = appState.game.selected.has(p.phone);
          let sub = p.pseudo ? `${p.phone} (${p.pseudo})` : p.phone;
          addRow(isSel ? "✅" : "⭕️", p.name, sub, isSel ? Color.green() : null, () => {
            isSel ? appState.game.selected.delete(p.phone) : appState.game.selected.add(p.phone); render();
          });
        });
      }

      // ─────────────────────────────────────────────
      // VIEW : ADVANCED SETTINGS
      else if (appState.view === "advanced") {
        addHeader("⚙️ Advanced", "Game settings");
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = appState.prevView; render(); });
        
        let pool = loadWordPool(sessionConfig.activeListName);
        let poolName = pool.missing ? `${sessionConfig.activeListName} (not found → ⭐ Built-in)` : sessionConfig.activeListName || "⭐ Built-in";
        addRow("📚", "Change word list", `Active: ${poolName} • ${listStatus(pool)}`, null, async () => { appState.view = "lists"; render(); });
        addRow("♻️", "Reset used words", "Puts every group of the active list back in play", null, async () => {
          let a = new Alert();
          a.title = "Reset the whitelist?";
          a.message = `The ${pool.groups.length} groups of "${pool.label}" can be drawn again.`;
          a.addDestructiveAction("Reset"); a.addCancelAction("Cancel");
          if (await a.presentAlert() === 0) { resetUsedWords(pool.key); render(); }
        });
        addRow("🏷️", "Include role in SMS", sessionConfig.showRoleInMessage ? "🟢 ON" : "⚪ OFF", null, () => { sessionConfig.showRoleInMessage = !sessionConfig.showRoleInMessage; saveConfig(); render(); });
        addRow("👤", "Include nickname in SMS", sessionConfig.showPseudoInMessage ? "🟢 ON" : "⚪ OFF", null, () => { sessionConfig.showPseudoInMessage = !sessionConfig.showPseudoInMessage; saveConfig(); render(); });
      }

      // ─────────────────────────────────────────────
      // VIEW : LIST SELECTION
      else if (appState.view === "lists") {
        addHeader("📚 Lists", "Choose the active word list");
        addRow("◀", "Back", "", Color.blue(), () => { appState.view = "advanced"; render(); });
        
        addRow("🔄", "Update official lists", "Downloads the lists from the repository", Color.blue(), async () => {
          let res = await syncRemoteLists();
          let a = new Alert();
          if (!res) {
            a.title = "❌ Download failed";
            a.message = "Unable to reach the repository. Check your internet connection.";
          } else {
            a.title = "✅ Lists up to date";
            a.message = `Downloaded: ${res.downloaded.join(", ") || "none"}` + (res.failed.length ? `\nFailed: ${res.failed.join(", ")}` : "");
          }
          a.addAction("OK"); await a.presentAlert();
          render();
        });

        addRow("⭐", "Built-in List", `Included in the script • ${listStatus(loadWordPool(null))}`, sessionConfig.activeListName === null ? Color.green() : null, () => {
          sessionConfig.activeListName = null; saveConfig(); appState.view = "advanced"; render();
        });
        
        getAvailableLists().forEach(list => {
           let pool = loadWordPool(list);
           let sub = pool.missing ? "⚠️ Invalid file" : listStatus(pool);
           addRow("📄", list, sub, sessionConfig.activeListName === list ? Color.green() : null, () => {
             sessionConfig.activeListName = list; saveConfig(); appState.view = "advanced"; render();
           });
        });
      }

      // ─────────────────────────────────────────────
      // VIEW : PLAYING (Rounds, Order, Eliminations)
      else if (appState.view === "playing") {
        if (appState.game.status === "ended") {
          addHeader(`🏁 Game Over`, "Roles are revealed");
          addRow("🏆", "Show end game summary", "And return to menu", Color.orange(), async () => {
             await showEndGameSummary();
             appState.view = "main";
             render();
          });

          let cell = new UITableRow();
          cell.isHeader = true; cell.addText("Players:").titleFont = Font.boldSystemFont(18);
          table.addRow(cell);

          appState.game.assignments.forEach(assign => {
            let name = assign.player.pseudo || assign.player.name;
            let isAlive = appState.game.alive.includes(assign.player.phone);
            let roleColor = assign.role === "Undercover" ? Color.red() : assign.role === "Civilian" ? Color.blue() : Color.dynamic(Color.darkGray(), Color.white());
            let icon = isAlive ? "🙂" : "💀";
            let row = new UITableRow();
            row.height = 55;
            let c = row.addText(`${icon} ${name}`, `${assign.role} ${assign.emoji} - Word: ${assign.word || "None"}`);
            if (!isAlive) {
               c.titleColor = Color.gray();
               c.subtitleColor = Color.gray();
            } else {
               c.subtitleColor = roleColor;
            }
            table.addRow(row);
          });
        } else {
          let aliveCount = appState.game.alive.length;
          addHeader(`🎙️ Round ${appState.game.round}`, `Alive: ${aliveCount} player(s)`);
          
          addRow("⚙️", "In-game settings", "Modify options", null, () => { appState.prevView = "playing"; appState.view = "advanced"; render(); });
          
          addRow("🛑", "Quit game", "Return to menu", Color.red(), async () => {
            let a = new Alert(); a.title = "Quit the game?"; a.message = "Progress will be lost."; a.addAction("Quit"); a.addCancelAction("Cancel");
            if (await a.presentAlert() === 0) {
              endGameLog(`Game abandoned during round ${appState.game.round}`);
              appState.view = "main"; render();
            }
          });

          let orderCell = new UITableRow();
          orderCell.isHeader = true; orderCell.addText("Alive (click to eliminate):").titleFont = Font.boldSystemFont(18);
          table.addRow(orderCell);

          let aliveSet = new Set(appState.game.alive);

          appState.game.turnOrder.forEach((phone, idx) => {
            let assign = appState.game.assignments.find(a => a.player.phone === phone);
            let name = assign.player.pseudo || assign.player.name;
            addRow(`${idx + 1}.`, name, "Alive", null, async () => {
              let a = new Alert();
              a.title = `Eliminate ${name}?`;
              a.addAction("Eliminate");
              a.addCancelAction("Cancel");
              if (await a.presentAlert() === 0) {
                await executeElimination(phone);
                render();
              }
            }, false);
          });

          let deadPlayers = appState.game.assignments.filter(a => !aliveSet.has(a.player.phone));
          if (deadPlayers.length > 0) {
            let deadCell = new UITableRow();
            deadCell.isHeader = true; deadCell.addText("Eliminated:").titleFont = Font.boldSystemFont(18);
            table.addRow(deadCell);

            deadPlayers.forEach(assign => {
              let name = assign.player.pseudo || assign.player.name;
              let roleColor = assign.role === "Undercover" ? Color.red() : assign.role === "Civilian" ? Color.blue() : Color.dynamic(Color.darkGray(), Color.white());
              let row = new UITableRow();
              row.height = 55;
              let cell = row.addText("💀 " + name, `is eliminated (${assign.role} ${assign.emoji})`);
              cell.titleColor = Color.gray();
              cell.subtitleColor = roleColor;
              table.addRow(row);
            });
          }
        }
      }

      table.reload();
    }

    render();
    await table.present(false);
    resolve("quit");
  });
}

// ─────────────────────────────────────────────
//  GAME LOGIC: DISTRIBUTION & ELIMINATION
// ─────────────────────────────────────────────

async function launchGame() {
  let selectedPlayers = appState.players.filter(p => appState.game.selected.has(p.phone));
  let effInfil = appState.game.nbInfil === -1 ? Math.ceil(selectedPlayers.length * 0.25) : appState.game.nbInfil;
  let effMW = appState.game.nbMW;

  const pool = loadWordPool(sessionConfig.activeListName);
  if (pool.missing) {
    let w = new Alert();
    w.title = "⚠️ List not found";
    w.message = `The list "${sessionConfig.activeListName}" is missing or invalid: the built-in list will be used.\n\nTip: Advanced settings > Change word list > Update official lists.`;
    w.addAction("OK"); await w.presentAlert();
  }

  let pair = pickPair(pool);
  if (!pair) {
    let a = new Alert();
    a.title = "📭 All words have been used";
    a.message = `All ${pool.groups.length} word groups of "${pool.label}" have been played in previous games.\n\nReset the whitelist to put them back in play, or choose another list.`;
    a.addDestructiveAction("Reset the whitelist");
    a.addCancelAction("Cancel");
    if (await a.presentAlert() !== 0) return;
    resetUsedWords(pool.key);
    pair = pickPair(pool);
  }

  appState.game.pair = pair;
  appState.game.assignments = assignRoles(selectedPlayers, effInfil, effMW, pair);
  appState.game.alive = selectedPlayers.map(p => p.phone);
  appState.game.round = 1;
  appState.game.turnOrder = buildTurnOrder(appState.game.alive);
  appState.game.status = "playing";
  appState.game.winnerType = null;
  appState.game.mrWhiteAssign = null;
  
  if (DEBUG_MODE) {
    appState.game.method = "debug";
    startGameLog();
    let lines = appState.game.assignments.map(a => `${a.emoji} ${a.player.name} → ${a.role} [${a.word || "—"}]`);
    let a = new Alert(); a.title = "🐛 DEBUG (No sending)"; a.message = lines.join("\n"); a.addAction("OK"); await a.presentAlert();
    appState.view = "playing";
    return;
  }

  let a = new Alert(); a.title = "📤 Starting";
  a.addAction("📱 Via SMS"); a.addAction("📋 On this screen");
  let c = await a.presentAlert();
  appState.game.method = c === 0 ? "sms" : "screen";
  startGameLog();

  if (c === 0) await sendInitialSMS();
  else await showOnScreen();
  logEvent("Word distribution complete");

  appState.view = "playing";
}

// Roles are drawn uniformly, then the distribution order is shuffled independently of the roles.
function assignRoles(players, nbInfil, nbMW, pair) {
  const assignments = shuffle(players).map((player, i) => {
    let role = i < nbMW ? "Mr. White" : i < nbMW + nbInfil ? "Undercover" : "Civilian";
    let word = role === "Mr. White" ? null : role === "Undercover" ? pair.undercover : pair.civil;
    let emoji = role === "Mr. White" ? "👻" : role === "Undercover" ? "🕵️" : "🙂";
    return { player, role, word, emoji };
  });
  return shuffle(assignments);
}

// Random speaking order; Mr. White never speaks first (official rule).
function buildTurnOrder(phones) {
  const order = shuffle(phones);
  const isMW = phone => appState.game.assignments.find(a => a.player.phone === phone).role === "Mr. White";
  const k = order.findIndex(phone => !isMW(phone));
  if (k > 0) [order[0], order[k]] = [order[k], order[0]];
  return order;
}

// ─────────────────────────────────────────────
// ELIMINATION MANAGEMENT
// ─────────────────────────────────────────────

async function executeElimination(killedPhone) {
  let killed = appState.game.assignments.find(x => x.player.phone === killedPhone);
  if (!killed) return;
  
  appState.game.alive = appState.game.alive.filter(phone => phone !== killed.player.phone);
  logEvent(`Round ${appState.game.round}: ${playerLabel(killed.player)} is eliminated — ${killed.role}`);

  if (killed.role === "Mr. White") {
    let mwAlert = new Alert();
    mwAlert.title = "👻 Mr. White is eliminated!";
    mwAlert.message = "Did he guess the Civilians' word?";
    mwAlert.addAction("Yes (Mr. White Wins)");
    mwAlert.addAction("No (He dies)");
    let guessed = await mwAlert.presentAlert() === 0;
    logEvent(`Mr. White ${guessed ? "guessed" : "did not guess"} the Civilians' word`);
    if (guessed) {
      computeEndGameStats("mrwhite", killed);
      return;
    }
  }

  let cCount = 0, iCount = 0, mwCount = 0;
  appState.game.alive.forEach(phone => {
    let r = appState.game.assignments.find(x => x.player.phone === phone).role;
    if (r === "Civilian") cCount++;
    else if (r === "Undercover") iCount++;
    else if (r === "Mr. White") mwCount++;
  });

  if (iCount === 0 && mwCount === 0) {
    computeEndGameStats("civils");
    return;
  } else if (cCount <= 1 && (iCount > 0 || mwCount > 0)) {
    computeEndGameStats("infiltres");
    return;
  }

  appState.game.round++;
  appState.game.turnOrder = buildTurnOrder(appState.game.alive);
  logEvent(`Round ${appState.game.round} — speaking order: ${turnOrderLabel()}`);
  
  if (!DEBUG_MODE) await notifyElimination(killed);
}

async function notifyElimination(killed) {
  let pName = killed.player.pseudo || killed.player.name;
  
  if (appState.game.method === "screen") {
    let a = new Alert(); a.title = "💀 Elimination";
    a.message = `${pName} is eliminated!\nThey were a ${killed.role} ${killed.emoji}`;
    a.addAction("OK"); await a.presentAlert();
  } else {
    let msgKilled = `💀 You have been eliminated!\nYour role was: ${killed.role} ${killed.emoji}`;
    let alert1 = new Alert(); alert1.title = `📤 Victim SMS: ${pName}`;
    alert1.addAction("Open Messages"); alert1.addCancelAction("Skip");
    if (await alert1.presentAlert() === 0) {
      Safari.openInApp(`sms:${killed.player.phone}&body=${encodeURIComponent(msgKilled)}`, false);
      await pause(1500);
    }
    
    let msgGroup = `💀 ${pName} has been eliminated!\nThey were a ${killed.role} ${killed.emoji}\nThe game continues.`;
    let phones = appState.game.alive.join(",");
    let alert2 = new Alert(); alert2.title = `📤 Group SMS (Survivors)`;
    alert2.addAction("Send to survivors"); alert2.addCancelAction("Skip");
    if (await alert2.presentAlert() === 0) {
      Safari.openInApp(`sms:${phones}&body=${encodeURIComponent(msgGroup)}`, false);
      await pause(1500);
    }
  }
}

function computeEndGameStats(winnerType, mrWhiteAssign = null) {
  appState.game.status = "ended";
  appState.game.winnerType = winnerType;
  appState.game.mrWhiteAssign = mrWhiteAssign;

  const updateStats = (phone, roleKey, isWin) => {
    let pObj = appState.players.find(p => p.phone === phone);
    if (pObj && pObj.roles) {
      if (!pObj.roles[roleKey]) pObj.roles[roleKey] = {played: 0, won: 0, lost: 0};
      pObj.roles[roleKey].played++;
      if (isWin) pObj.roles[roleKey].won++;
      else pObj.roles[roleKey].lost++;
    }
  };

  appState.game.assignments.forEach(a => {
    let roleKey = a.role === "Civilian" ? "civil" : a.role === "Undercover" ? "infiltre" : "mrwhite";
    let isWin = false;
    if (winnerType === "civils" && a.role === "Civilian") isWin = true;
    else if (winnerType === "infiltres" && (a.role === "Undercover" || a.role === "Mr. White")) isWin = true;
    else if (winnerType === "mrwhite" && a.role === "Mr. White" && a.player.phone === (mrWhiteAssign ? mrWhiteAssign.player.phone : null)) isWin = true;
    
    updateStats(a.player.phone, roleKey, isWin);
  });
  
  if (winnerType === "civils") {
    appState.game.assignments.forEach(a => { if(a.role === "Civilian") { addScore(a.player.phone, 2); } });
  } 
  else if (winnerType === "infiltres") {
    appState.game.assignments.forEach(a => { 
      if(a.role === "Undercover") { addScore(a.player.phone, 10); }
      if(a.role === "Mr. White") { addScore(a.player.phone, 6); }
    });
  } 
  else if (winnerType === "mrwhite") {
    addScore(mrWhiteAssign ? mrWhiteAssign.player.phone : null, 6);
  }

  savePlayers();

  const results = { civils: "Civilians win", infiltres: "Undercovers / Mr. White win", mrwhite: "Mr. White wins (word guessed)" };
  const points = { civils: { "Civilian": 2 }, infiltres: { "Undercover": 10, "Mr. White": 6 }, mrwhite: {} }[winnerType];
  const scored = appState.game.assignments
    .map(a => ({ a, pts: winnerType === "mrwhite" ? (a === mrWhiteAssign ? 6 : 0) : (points[a.role] || 0) }))
    .filter(x => x.pts > 0)
    .map(x => `${playerLabel(x.a.player)} +${x.pts}`);
  const survivors = appState.game.assignments.filter(a => appState.game.alive.includes(a.player.phone)).map(a => playerLabel(a.player));
  endGameLog(`Game over after ${appState.game.round} round(s)`, ["", `RESULT: ${results[winnerType]}`, `Survivors: ${survivors.join(", ") || "none"}`, `Points: ${scored.join(", ") || "none"}`]);
}

async function showEndGameSummary() {
  let title = "🎉 GAME OVER";
  let msg = "";
  let winnerType = appState.game.winnerType;
  let mrWhiteAssign = appState.game.mrWhiteAssign;

  if (winnerType === "civils") {
    msg = "The Civilians won! All imposters are eliminated.\n(+2 pts per Civilian)";
  } 
  else if (winnerType === "infiltres") {
    msg = "The Undercovers and Mr. White survived! Only one Civilian remains.\n(+10 pts Undercover / +6 pts Mr. White)";
  } 
  else if (winnerType === "mrwhite") {
    msg = "Mr. White guessed the word and steals the victory!\n(+6 pts for him)";
  }

  let pair = appState.game.pair;
  msg += `\n\n🔑 Secret words:\nCivilian: ${pair.civil}\nUndercover: ${pair.undercover}`;

  let a = new Alert(); a.title = title; a.message = msg; a.addAction("Return to menu");
  await a.presentAlert();
}

// ─────────────────────────────────────────────
// INITIAL COMMUNICATION FUNCTIONS
// ─────────────────────────────────────────────

function buildMessage(assign) {
  let pseudoPart = (sessionConfig.showPseudoInMessage && assign.player.pseudo) ? `👤 Player: ${assign.player.pseudo}\n\n` : "";
  if (assign.role === "Mr. White") return `🕵️ UNDERCOVER 🕵️\n\n${pseudoPart}Mr. White\nYou don't have a word.\n\nBluff, stay discreet and find the secret word!`;
  let rolePart = sessionConfig.showRoleInMessage ? `${assign.emoji} Role: ${assign.role}\n\n` : "";
  return `🕵️ UNDERCOVER 🕵️\n\n${pseudoPart}${rolePart}🔑 Your word: « ${assign.word} »\n\nDo not reveal it to anyone!`;
}

async function sendInitialSMS() {
  let as = appState.game.assignments;
  for (let i = 0; i < as.length; i++) {
    let a = new Alert(); a.title = `📤 Initial SMS ${i + 1}/${as.length}`; a.message = `Recipient: ${as[i].player.name}`;
    a.addAction("Open Messages"); a.addAction("Skip"); a.addCancelAction("Stop");
    let c = await a.presentAlert();
    if (c === -1) { logEvent("SMS sending stopped"); break; }
    if (c === 0) { Safari.openInApp(`sms:${as[i].player.phone}&body=${encodeURIComponent(buildMessage(as[i]))}`, false); await pause(1500); }
    else logEvent(`SMS not sent to ${playerLabel(as[i].player)}`);
  }
}

// For each player: first announce who to hand the phone to, and only reveal
// the word once that player has confirmed they are holding the device.
async function showOnScreen() {
  let as = appState.game.assignments;
  for (let i = 0; i < as.length; i++) {
    let name = as[i].player.name + (as[i].player.pseudo ? ` (${as[i].player.pseudo})` : "");

    let t = new Alert();
    t.title = `📱 Player ${i + 1}/${as.length}`;
    t.message = `Hand the phone to:\n\n${name}\n\nOther players must not look at the screen.`;
    t.addAction(`I am ${as[i].player.name}, show my word`);
    await t.presentAlert();

    let a = new Alert();
    a.title = `🤫 ${as[i].player.name}`;
    a.message = buildMessage(as[i]);
    a.addAction("I read it ✓ (hide)");
    await a.presentAlert();
  }

  let first = appState.game.assignments.find(x => x.player.phone === appState.game.turnOrder[0]);
  let end = new Alert();
  end.title = "✅ Distribution complete";
  end.message = `Give the phone back to the game master.\n\n${first.player.pseudo || first.player.name} starts round 1.`;
  end.addAction("Start the game");
  await end.presentAlert();
}

// ─────────────────────────────────────────────
//  MAIN LOOP
// ─────────────────────────────────────────────

async function main() {
  ensureStorage();
  await prefetchStorage();
  loadConfig();
  appState.players = loadPlayers();

  // First install or update: the active list is not on the device yet.
  if (sessionConfig.activeListName && !getFM().fileExists(listFilePath(sessionConfig.activeListName))) {
    await syncRemoteLists();
  }
  
  while(true) {
    let action = await startApp();
    if (action === "quit") {
      if (appState.view === "playing" && appState.game.status === "playing") endGameLog(`App closed during round ${appState.game.round}`);
      break;
    }
    if (action === "launch") await launchGame();
  }
}

await main();