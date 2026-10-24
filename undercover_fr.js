// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: user-secret;
// ============================================================
//  UNDERCOVER — Script Scriptable complet (Façon Raccourcis)
//  Version : 1.0
//  Auteur : ~WolfGang_PRoxa~
//  Description : Un script pour gérer vos parties d'Undercover, avec tirage de rôles, envoi de SMS, et suivi des scores.
//  Fonctionnalités : Déroulement de partie, conditions de 
//  victoire, SMS d'élimination, classement des joueurs.
// ============================================================

// ─────────────────────────────────────────────
//  CONSTANTES GLOBALES ET DONNÉES
// ─────────────────────────────────────────────

let DEBUG_MODE = false;

const FOLDER_NAME   = "Undercover";
const LISTS_FOLDER  = "lists";
const FILE_PLAYERS  = "players.json";
const FILE_CONFIG   = "config.json";
const LOGS_FOLDER   = "logs";
const APP_VERSION   = "1.0";
const LANG          = "fr";
const REPO_RAW_URL  = "https://raw.githubusercontent.com/WolfGang-PRoxa/undercover-scriptable/main";
const EMBEDDED_KEY  = "__embarquee";

// Liste embarquée : copie de lists/default_fr.json, utilisée hors-ligne ou si la liste active est introuvable.
const EMBEDDED_WORDS = [
  ["Chat", "Tigre", "Lion", "Panthère"],
  ["Coca-Cola", "Pepsi", "Oasis", "Orangina"],
  ["Football", "Rugby", "Handball", "Basketball"],
  ["Chocolat", "Cacao", "Café", "Thé"],
  ["Plage", "Piscine", "Lac", "Rivière"],
  ["Voiture", "Moto", "Vélo", "Scooter"],
  ["Paris", "Lyon", "Marseille", "Bordeaux"],
  ["Pizza", "Quiche", "Tarte", "Crêpe"],
  ["Guitare", "Violon", "Violoncelle", "Basse"],
  ["Cinéma", "Théâtre", "Concert", "Opéra"],
  ["Requin", "Dauphin", "Baleine", "Orque"],
  ["Pomme", "Poire", "Pêche", "Abricot"],
  ["Ski", "Snowboard", "Luge", "Patin à glace"],
  ["Château", "Manoir", "Palais", "Villa"],
  ["Soleil", "Lune", "Étoile", "Planète"],
  ["Rouge", "Bleu", "Vert", "Jaune"],
  ["Avion", "Hélicoptère", "Montgolfière", "Fusée"],
  ["Livre", "Magazine", "Journal", "Bande dessinée"],
  ["Or", "Argent", "Bronze", "Cuivre"],
  ["Chien", "Loup", "Renard", "Coyote"],
  ["Table", "Chaise", "Tabouret", "Banc"],
  ["Stylo", "Crayon", "Feutre", "Surligneur"],
  ["Veste", "Manteau", "Pull", "Gilet"],
  ["Bateau", "Navire", "Voilier", "Sous-marin"],
  ["Ordinateur", "Tablette", "Smartphone", "Console"],
  ["Piano", "Clavier", "Orgue", "Synthétiseur"],
  ["Boulangerie", "Pâtisserie", "Boucherie", "Épicerie"],
  ["Sapin", "Chêne", "Bouleau", "Érable"],
  ["Gâteau", "Biscuit", "Cookie", "Brownie"],
  ["Montagne", "Colline", "Vallée", "Plateau"],
  ["Glace", "Sorbet", "Crème glacée", "Granité"],
  ["Pantalon", "Short", "Jeans", "Jogging"],
  ["Bière", "Vin", "Cidre", "Champagne"],
  ["Train", "Métro", "Tramway", "Bus"],
  ["Aigle", "Faucon", "Chouette", "Hibou"],
  ["Banane", "Orange", "Clémentine", "Pamplemousse"],
  ["Lunettes", "Lentilles", "Jumelles", "Microscope"],
  ["Douche", "Bain", "Jacuzzi", "Hammam"],
  ["Terre", "Mars", "Vénus", "Jupiter"],
  ["Mer", "Océan", "Lagune", "Baie"],
  ["Fraise", "Framboise", "Myrtille", "Mûre"],
  ["Chambre", "Salon", "Cuisine", "Salle de bain"],
  ["Hiver", "Été", "Printemps", "Automne"],
  ["Cheval", "Poney", "Âne", "Mule"],
  ["Girafe", "Zèbre", "Éléphant", "Hippopotame"],
  ["Couteau", "Fourchette", "Cuillère", "Spatule"],
  ["Araignée", "Fourmi", "Abeille", "Moustique"],
  ["Ciel", "Nuage", "Pluie", "Neige"],
  ["Diamant", "Rubis", "Émeraude", "Saphir"],
  ["Pompier", "Policier", "Médecin", "Infirmier"]
];

let sessionConfig = {
  showRoleInMessage: false,
  showPseudoInMessage: false,
  activeListName: "default_fr",
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
//  GESTION FICHIERS & DONNÉES
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

// Les fichiers iCloud peuvent être déchargés de l'appareil : on les rapatrie avant toute lecture synchrone.
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
//  LISTES DE MOTS
// ─────────────────────────────────────────────

function getAvailableLists() {
  const fm = getFM(), lp = listsPath(), names = [];
  try { fm.listContents(lp).forEach(f => { if (f.endsWith(".json") && !f.includes("__used_words")) names.push(f.replace(".json", "")); }); } catch (e) {}
  return names.sort();
}

// Normalise une liste brute en groupes { id, words, fixed }.
// Formats acceptés : [["Mot A", "Mot B", ...], ...] ou [{ "civil": "...", "undercover": "..." }, ...]
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

// Réserve de mots d'une liste. Si la liste est absente ou invalide, on bascule sur la liste embarquée.
function loadWordPool(listName) {
  if (listName) {
    const groups = parseWordList(readJSON(listFilePath(listName), null));
    if (groups.length > 0) return { key: listName, label: listName, groups, missing: false };
  }
  return { key: EMBEDDED_KEY, label: "Liste embarquée", groups: parseWordList(EMBEDDED_WORDS), missing: !!listName };
}

function loadUsedWords(key) {
  const data = readJSON(usedWordsPath(key), []);
  return Array.isArray(data) ? data : [];
}

function resetUsedWords(key) { writeJSON(usedWordsPath(key), []); }

// Liste blanche : groupes de la liste qui n'ont encore été joués dans aucune partie.
function remainingGroups(pool) {
  const usedSet = new Set(loadUsedWords(pool.key).map(u => u.id || (u.civil + "|" + u.undercover)));
  return pool.groups.filter(g => !usedSet.has(g.id));
}

// Tire un groupe de la liste blanche et le retire pour les parties suivantes.
// Renvoie null lorsque tous les groupes ont déjà été joués.
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

// Télécharge les listes officielles référencées dans lists/index.json sur le dépôt.
// Renvoie { downloaded, failed } ou null si le dépôt est injoignable.
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
      if (parseWordList(JSON.parse(text)).length === 0) throw new Error("Liste vide");
      getFM().writeString(listFilePath(name), text);
      result.downloaded.push(name);
    } catch (e) { result.failed.push(name); }
  }
  return result;
}

function listStatus(pool) {
  return `${remainingGroups(pool).length}/${pool.groups.length} groupes restants`;
}

// ─────────────────────────────────────────────
//  JOURNAL DES PARTIES
// ─────────────────────────────────────────────

// Chaque partie produit un fichier texte lisible dans Undercover/logs/,
// accessible depuis l'app Fichiers (voir logsLocation()).

function pad2(n) { return String(n).padStart(2, "0"); }
function formatDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function storageLabel() { try { FileManager.iCloud(); return "iCloud Drive"; } catch (e) { return "Sur mon iPhone"; } }
function logsLocation() { return `Fichiers > ${storageLabel()} > Scriptable > ${FOLDER_NAME} > ${LOGS_FOLDER}`; }
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
  const methods = { sms: "SMS", screen: "Sur cet écran", debug: "Mode Debug (aucun envoi)" };
  const lines = [
    "UNDERCOVER — Journal de partie",
    `Date : ${formatDate(now)}`,
    `Version : ${APP_VERSION}`,
    `Liste de mots : ${pair.listLabel} (${pair.remaining}/${pair.total} groupes restants après ce tirage)`,
    `Groupe tiré : ${pair.words.join(", ")}`,
    `Mot des Civils : ${pair.civil}`,
    `Mot des Infiltrés : ${pair.undercover}`,
    `Distribution : ${methods[g.method]}`,
    "",
    `Joueurs (${g.assignments.length}) :`,
    ...g.assignments.map(a => `  - ${playerLabel(a.player)} → ${a.role} [${a.word || "aucun mot"}]`),
    "",
    "Déroulement :",
  ];
  const stamp = formatDate(now).replace(" ", "_").replace(/:/g, "-");
  g.log = { path: getFM().joinPath(logsPath(), `partie_${stamp}.txt`), lines };
  logEvent(`Manche 1 — ordre de parole : ${turnOrderLabel()}`);
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
//  UTILITAIRES
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
//  MOTEUR UI SINGLE PAGE (SPA)
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
      // VUE : MENU PRINCIPAL
      if (appState.view === "main") {
        addHeader("🕵️ UNDERCOVER", `Scriptable Edition - v${APP_VERSION}`);
        addRow("🎮", "Lancer une partie", "Configurer et démarrer", Color.blue(), () => { appState.view = "config"; render(); });
        addRow("👥", "Gérer les joueurs", `${appState.players.length} enregistré(s)`, null, () => { appState.view = "players"; render(); });
        addRow("🏆", "Classement & Scores", "Statistiques des joueurs", Color.orange(), () => { appState.view = "stats"; render(); });
        addRow("📖", "Règles du jeu", "Fonctionnement de la partie", null, () => { appState.view = "rules"; render(); });
        addRow("📜", "Historique des parties", `${getGameLogs().length} partie(s) enregistrée(s)`, null, () => { appState.view = "logs"; render(); });
        addRow("⚙️", "Configuration avancée", "Mots, affichage...", null, () => { appState.prevView = "main"; appState.view = "advanced"; render(); });
        
        addRow("🐛", "Mode Debug", DEBUG_MODE ? "🟢 ON (Test)" : "⚪ OFF", DEBUG_MODE ? Color.orange() : Color.gray(), () => { DEBUG_MODE = !DEBUG_MODE; saveConfig(); render(); });
        addRow("❌", "Quitter", "", Color.red(), () => resolve("quit"), true);
      }

      // ─────────────────────────────────────────────
      // VUE : RÈGLES DU JEU
      else if (appState.view === "rules") {
        addHeader("Règles du jeu", "Fonctionnement et victoire");
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = "main"; render(); });

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

        addSection("But du jeu", "Chaque joueur reçoit un rôle secret. Les Civils reçoivent tous le même mot. Les Infiltrés reçoivent un mot similaire mais légèrement différent. Mister White ne reçoit aucun mot.\nLe but des Civils est de démasquer les intrus. Le but des imposteurs est de survivre.");
        addSection("Déroulement d'un tour", "1. À tour de rôle, chaque joueur énonce un mot en rapport avec son mot secret.\n2. Une fois que tous les joueurs ont parlé, un débat commence pour identifier l'intrus.\n3. À l'issue du débat, le groupe vote et élimine un participant. Son rôle est alors révélé.");
        addSection("Rôles et Stratégie", "Civil : Trouvez les intrus sans utiliser des indices trop évidents qui aideraient Mister White.\nInfiltré : Fondez-vous dans la masse en déduisant le thème général du mot des Civils.\nMister White : Vous n'avez aucun mot. Observez, bluffez et tentez de découvrir le mot des Civils.");
        addSection("Conditions de Victoire", "Civils : Ils éliminent tous les Infiltrés et Mister White.\nInfiltrés : Ils survivent jusqu'à ce qu'il ne reste qu'un seul Civil.\nMister White : Il survit jusqu'à la fin, OU il est éliminé mais parvient à deviner le mot exact des Civils.");
      }

      // ─────────────────────────────────────────────
      // VUE : HISTORIQUE DES PARTIES
      else if (appState.view === "logs") {
        let logs = getGameLogs();
        addHeader("📜 Historique", `${logs.length} partie(s) enregistrée(s)`);
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = "main"; render(); });
        addRow("📂", "Emplacement des journaux", logsLocation(), Color.gray());

        logs.slice(0, 50).forEach(f => {
          let content = "";
          try { content = getFM().readString(getFM().joinPath(logsPath(), f)); } catch (e) {}
          let result = (content.match(/^RÉSULTAT : (.*)$/m) || [])[1] || "Partie non terminée";
          let date = f.replace(/^partie_/, "").replace(".txt", "").replace("_", " à ").replace(/-(\d\d)-(\d\d)$/, ":$1:$2");
          addRow("🗒️", date, result, null, async () => { await QuickLook.present(content, true); });
        });

        if (logs.length > 0) {
          addRow("🗑️", "Effacer l'historique", "Supprime tous les journaux", Color.red(), async () => {
            let a = new Alert(); a.title = "Effacer l'historique ?"; a.message = `${logs.length} journal(aux) seront supprimés.`;
            a.addDestructiveAction("Effacer"); a.addCancelAction("Annuler");
            if (await a.presentAlert() === 0) { logs.forEach(f => getFM().remove(getFM().joinPath(logsPath(), f))); render(); }
          });
        }
      }

      // ─────────────────────────────────────────────
      // VUE : CLASSEMENT
      else if (appState.view === "stats") {
        addHeader("🏆 Classement", "Scores cumulés");
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = "main"; render(); });
        
        let sorted = [...appState.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (sorted.length === 0) addRow("ℹ️", "Aucun joueur", "Ajoutez des joueurs pour commencer.", Color.gray());
        
        sorted.forEach((p, idx) => {
          let med = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🔹";
          let pRoles = p.roles || { civil: {played:0, won:0, lost:0}, infiltre: {played:0, won:0, lost:0}, mrwhite: {played:0, won:0, lost:0} };
          let rolesStr = ` 🤠 ${pRoles.civil.played} | 🕵️ ${pRoles.infiltre.played} | 👻 ${pRoles.mrwhite.played}`;
          let sub = (p.pseudo ? `Pseudo: ${p.pseudo}` : p.phone) + rolesStr;
          
          addRow(med, p.name, sub, null, () => {
            appState.selectedPlayerPhone = p.phone;
            appState.view = "player_stats";
            render();
          }, false, (p.score || 0) + " pts");
        });
      }

      // ─────────────────────────────────────────────
      // VUE : STATISTIQUES DU JOUEUR
      else if (appState.view === "player_stats") {
        let p = appState.players.find(x => x.phone === appState.selectedPlayerPhone);
        if (!p) { appState.view = "stats"; render(); return; }
        
        let pRoles = p.roles || { civil: {played:0, won:0, lost:0}, infiltre: {played:0, won:0, lost:0}, mrwhite: {played:0, won:0, lost:0} };

        addHeader(`Gérer ${p.name}`, `Score global : ${p.score || 0}`);
        addRow("◀", "Retour au classement", "", Color.blue(), () => { appState.view = "stats"; render(); });

        addRow("✏️", "Modifier le score global", "", null, async () => {
          let aScore = new Alert();
          aScore.title = "Nouveau score";
          aScore.addTextField("Ex: 10", String(p.score || 0));
          aScore.addAction("Enregistrer");
          aScore.addCancelAction("Annuler");
          if (await aScore.presentAlert() === 0) {
            let val = parseInt(aScore.textFieldValue(0));
            if (!isNaN(val)) { p.score = val; savePlayers(); render(); }
          }
        });

        let statsHeader = new UITableRow();
        statsHeader.isHeader = true; statsHeader.height = 40;
        let shCell = statsHeader.addText("Statistiques par rôle");
        shCell.titleFont = Font.boldSystemFont(20);
        table.addRow(statsHeader);

        const addRoleStatRow = (icon, roleName, roleKey) => {
           let rStats = pRoles[roleKey];
           let subtitle = `${rStats.played} jouée(s) | ${rStats.won}V - ${rStats.lost}D`;
           addRow(icon, roleName, subtitle, null, async () => {
             let aEdit = new Alert();
             aEdit.title = `Stats : ${roleName}`;
             aEdit.addTextField("Jouées", String(rStats.played));
             aEdit.addTextField("Gagnées", String(rStats.won));
             aEdit.addTextField("Perdues", String(rStats.lost));
             aEdit.addAction("Enregistrer");
             aEdit.addCancelAction("Annuler");
             if (await aEdit.presentAlert() === 0) {
               rStats.played = parseInt(aEdit.textFieldValue(0)) || 0;
               rStats.won = parseInt(aEdit.textFieldValue(1)) || 0;
               rStats.lost = parseInt(aEdit.textFieldValue(2)) || 0;
               savePlayers(); render(); 
             }
           });
        };

        addRoleStatRow("🤠", "Civils", "civil");
        addRoleStatRow("🕵️", "Infiltrés", "infiltre");
        addRoleStatRow("👻", "Mister White", "mrwhite");

        addRow("🗑️", "Tout réinitialiser", "Remet à 0 le score et les stats", Color.red(), async () => {
             let a = new Alert();
             a.title = "Réinitialiser " + p.name;
             a.message = "Voulez-vous réinitialiser le score et les statistiques de rôles ?";
             a.addDestructiveAction("Réinitialiser");
             a.addCancelAction("Annuler");
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
      // VUE : GESTION DES JOUEURS
      else if (appState.view === "players") {
        addHeader("👥 Joueurs", `${appState.players.length} joueur(s) prêt(s)`);
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = "main"; render(); });
        addRow("📇", "Importer depuis Contacts", "", null, () => { appState.view = "contacts"; render(); });
        addRow("✏️", "Ajouter manuellement", "", null, async () => {
          let a = new Alert(); a.title = "Nouveau joueur";
          a.addTextField("Nom", ""); a.addTextField("Numéro (+33...)", "");
          a.addAction("Ajouter"); a.addCancelAction("Annuler");
          if (await a.presentAlert() === 0) {
            let n = a.textFieldValue(0).trim();
            let p = normalizePhone(a.textFieldValue(1).trim());
            if (n && isValidPhone(p)) {
              if (!appState.players.some(x => x.phone === p)) { appState.players.push({name: n, phone: p, score: 0, roles: { civil: {played: 0, won: 0, lost: 0}, infiltre: {played: 0, won: 0, lost: 0}, mrwhite: {played: 0, won: 0, lost: 0} }}); savePlayers(); render(); }
            }
          }
        });
        
        appState.players.forEach((p, idx) => {
          let sub = p.phone + (p.pseudo ? `  •  Pseudo : ${p.pseudo}` : "");
          addRow("👤", p.name, sub, null, async () => {
            let a = new Alert(); a.title = `Gérer ${p.name}`;
            a.addAction(p.pseudo ? "Modifier le pseudo" : "Ajouter un pseudo");
            a.addDestructiveAction("Supprimer le joueur"); a.addCancelAction("Annuler");
            let res = await a.presentAlert();
            if (res === 0) {
              let pAlert = new Alert(); pAlert.title = `Pseudo`; pAlert.addTextField("Pseudo", p.pseudo || "");
              pAlert.addAction("Enregistrer"); pAlert.addCancelAction("Annuler");
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
      // VUE : IMPORT DE CONTACTS (TEMPS RÉEL)
      else if (appState.view === "contacts") {
        addHeader("📇 Contacts", appState.contactQuery ? `Filtre: "${appState.contactQuery}"` : "Recherchez pour filtrer");
        addRow("◀", "Retour aux joueurs", "", Color.blue(), () => { appState.view = "players"; appState.contactQuery = ""; render(); });
        
        if (!appState.contacts) {
          addRow("⏳", "Chargement du carnet d'adresses...", "Patientez...", Color.gray());
          loadAllContactsWithPhone().then(c => { appState.contacts = c; render(); });
          table.reload(); return;
        }

        if (appState.contactQuery) {
          addRow("✖️", "Effacer la recherche", "", Color.orange(), () => { appState.contactQuery = ""; render(); });
        } else {
          addRow("🔍", "Rechercher un contact...", "Taper un nom", Color.blue(), async () => {
            let a = new Alert(); a.title = "Recherche"; a.addTextField("Nom...", "");
            a.addAction("Filtrer"); a.addCancelAction("Annuler");
            if (await a.presentAlert() === 0) { appState.contactQuery = a.textFieldValue(0).trim(); render(); }
          });
        }

        let q = appState.contactQuery.toLowerCase();
        let filtered = appState.contacts.filter(c => ((c.givenName||'')+' '+(c.familyName||'')).toLowerCase().includes(q));

        filtered.forEach(c => {
          let cName = ((c.givenName||"")+" "+(c.familyName||"")).trim() || "(sans nom)";
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
                let a = new Alert(); a.title = "Choisir le numéro";
                c.phoneNumbers.forEach(pn => a.addAction(`${pn.label||"?"} : ${pn.value}`));
                a.addCancelAction("Annuler");
                let res = await a.presentAlert();
                if (res === -1) return;
                chosenPhone = phones[res];
              }
              // Ajout du joueur avec un score initialisé à 0
              appState.players.push({name: cName, phone: chosenPhone, score: 0, roles: { civil: {played: 0, won: 0, lost: 0}, infiltre: {played: 0, won: 0, lost: 0}, mrwhite: {played: 0, won: 0, lost: 0} }});
              savePlayers(); render();
            });
          }
        });
      }

      // ─────────────────────────────────────────────
      // VUE : CONFIGURATION DE LA PARTIE
      else if (appState.view === "config") {
        let validPlayers = appState.players.filter(p => appState.game.selected.has(p.phone));
        let n = validPlayers.length;
        let effInfil = appState.game.nbInfil === -1 ? Math.ceil(n * 0.25) : appState.game.nbInfil;
        let effMW = appState.game.nbMW;
        let nbCivils = n - effInfil - effMW;
        let invalidReason = n < 3 ? "Sélectionnez 3 joueurs min."
          : effInfil + effMW === 0 ? "Il faut au moins 1 Infiltré ou Mister White"
          : nbCivils < 2 ? "Il faut au moins 2 Civils"
          : null;
        let isValid = invalidReason === null;

        addHeader("Nouvelle Partie", `${n} sélectionnés | Civils: ${Math.max(0, n - effInfil - effMW)} | Inf: ${effInfil} | MW: ${effMW}`);
        addRow("◀", "Retour au menu", "", Color.orange(), () => { appState.view = "main"; render(); });
        
        addRow("⚙️", "Réglages de la partie", "Modifier mots, pseudos...", null, () => {
          appState.prevView = "config"; appState.view = "advanced"; render();
        });

        addRow("🚀", "LANCER LA PARTIE", isValid ? "Cliquez pour démarrer" : invalidReason, isValid ? Color.blue() : Color.gray(), () => {
          if (isValid) resolve("launch");
        }, isValid);

        addRow("🕵️", `Infiltrés : ${appState.game.nbInfil === -1 ? effInfil + " (Auto)" : effInfil}`, "Cliquez pour modifier", null, async () => {
          let a = new Alert(); a.title = "Nombre d'infiltrés"; a.addTextField("Ex: 1", String(effInfil));
          a.addAction("Forcer la valeur"); a.addAction("Remettre en Auto"); a.addCancelAction("Annuler");
          let r = await a.presentAlert();
          if (r === 0) appState.game.nbInfil = Math.max(0, parseInt(a.textFieldValue(0)) || 0);
          else if (r === 1) appState.game.nbInfil = -1;
          render();
        });

        addRow("👻", `Mister White : ${effMW}`, "Cliquez pour modifier", null, async () => {
          let a = new Alert(); a.title = "Nombre de Mister White"; a.addTextField("Ex: 0", String(effMW));
          a.addAction("Valider"); a.addCancelAction("Annuler");
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
      // VUE : CONFIGURATION AVANCÉE
      else if (appState.view === "advanced") {
        addHeader("⚙️ Avancé", "Réglages du jeu");
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = appState.prevView; render(); });
        
        let pool = loadWordPool(sessionConfig.activeListName);
        let poolName = pool.missing ? `${sessionConfig.activeListName} (introuvable → ⭐ Embarquée)` : sessionConfig.activeListName || "⭐ Embarquée";
        addRow("📚", "Changer de liste de mots", `Active : ${poolName} • ${listStatus(pool)}`, null, async () => { appState.view = "lists"; render(); });
        addRow("♻️", "Réinitialiser les mots utilisés", "Remet tous les groupes de la liste active en jeu", null, async () => {
          let a = new Alert();
          a.title = "Réinitialiser la liste blanche ?";
          a.message = `Les ${pool.groups.length} groupes de « ${pool.label} » pourront de nouveau être tirés.`;
          a.addDestructiveAction("Réinitialiser"); a.addCancelAction("Annuler");
          if (await a.presentAlert() === 0) { resetUsedWords(pool.key); render(); }
        });
        addRow("🏷️", "Inclure rôle dans le SMS", sessionConfig.showRoleInMessage ? "🟢 ON" : "⚪ OFF", null, () => { sessionConfig.showRoleInMessage = !sessionConfig.showRoleInMessage; saveConfig(); render(); });
        addRow("👤", "Inclure pseudo dans le SMS", sessionConfig.showPseudoInMessage ? "🟢 ON" : "⚪ OFF", null, () => { sessionConfig.showPseudoInMessage = !sessionConfig.showPseudoInMessage; saveConfig(); render(); });
      }

      // ─────────────────────────────────────────────
      // VUE : SÉLECTION DE LISTE
      else if (appState.view === "lists") {
        addHeader("📚 Listes", "Choisissez la liste de mots active");
        addRow("◀", "Retour", "", Color.blue(), () => { appState.view = "advanced"; render(); });
        
        addRow("🔄", "Mettre à jour les listes officielles", "Télécharge les listes depuis le dépôt", Color.blue(), async () => {
          let res = await syncRemoteLists();
          let a = new Alert();
          if (!res) {
            a.title = "❌ Échec du téléchargement";
            a.message = "Impossible de joindre le dépôt. Vérifiez votre connexion internet.";
          } else {
            a.title = "✅ Listes à jour";
            a.message = `Téléchargées : ${res.downloaded.join(", ") || "aucune"}` + (res.failed.length ? `\nÉchecs : ${res.failed.join(", ")}` : "");
          }
          a.addAction("OK"); await a.presentAlert();
          render();
        });

        addRow("⭐", "Liste Embarquée", `Incluse dans le script • ${listStatus(loadWordPool(null))}`, sessionConfig.activeListName === null ? Color.green() : null, () => {
          sessionConfig.activeListName = null; saveConfig(); appState.view = "advanced"; render();
        });
        
        getAvailableLists().forEach(list => {
           let pool = loadWordPool(list);
           let sub = pool.missing ? "⚠️ Fichier invalide" : listStatus(pool);
           addRow("📄", list, sub, sessionConfig.activeListName === list ? Color.green() : null, () => {
             sessionConfig.activeListName = list; saveConfig(); appState.view = "advanced"; render();
           });
        });
      }

      // ─────────────────────────────────────────────
      // VUE : EN JEU (Manches, Ordre, Éliminations)
      else if (appState.view === "playing") {
        if (appState.game.status === "ended") {
          addHeader(`🏁 Partie terminée`, "Les rôles sont révélés");
          addRow("🏆", "Afficher le résumé de fin de partie", "Et retourner au menu", Color.orange(), async () => {
             await showEndGameSummary();
             appState.view = "main";
             render();
          });

          let cell = new UITableRow();
          cell.isHeader = true; cell.addText("Joueurs :").titleFont = Font.boldSystemFont(18);
          table.addRow(cell);

          appState.game.assignments.forEach(assign => {
            let name = assign.player.pseudo || assign.player.name;
            let isAlive = appState.game.alive.includes(assign.player.phone);
            let roleColor = assign.role === "Infiltré" ? Color.red() : assign.role === "Civil" ? Color.blue() : Color.dynamic(Color.darkGray(), Color.white());
            let icon = isAlive ? "🙂" : "💀";
            let row = new UITableRow();
            row.height = 55;
            let c = row.addText(`${icon} ${name}`, `${assign.role} ${assign.emoji} - Mot: ${assign.word || "Aucun"}`);
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
          addHeader(`Manche ${appState.game.round}`, `Vivants : ${aliveCount} joueur(s)`);
          
          addRow("⚙️", "Réglages en jeu", "Modifier les options", null, () => { appState.prevView = "playing"; appState.view = "advanced"; render(); });
          
          addRow("🛑", "Quitter la partie", "Retour au menu", Color.red(), async () => {
            let a = new Alert(); a.title = "Quitter la partie ?"; a.message = "La progression sera perdue."; a.addAction("Quitter"); a.addCancelAction("Annuler");
            if (await a.presentAlert() === 0) {
              endGameLog(`Partie abandonnée pendant la manche ${appState.game.round}`);
              appState.view = "main"; render();
            }
          });

          let orderCell = new UITableRow();
          orderCell.isHeader = true; orderCell.addText("Vivants (cliquez pour éliminer) :").titleFont = Font.boldSystemFont(18);
          table.addRow(orderCell);

          let aliveSet = new Set(appState.game.alive);

          appState.game.turnOrder.forEach((phone, idx) => {
            let assign = appState.game.assignments.find(a => a.player.phone === phone);
            let name = assign.player.pseudo || assign.player.name;
            addRow(`${idx + 1}.`, name, "Vivant", null, async () => {
              let a = new Alert();
              a.title = `Éliminer ${name} ?`;
              a.addAction("Éliminer");
              a.addCancelAction("Annuler");
              if (await a.presentAlert() === 0) {
                await executeElimination(phone);
                render();
              }
            }, false);
          });

          let deadPlayers = appState.game.assignments.filter(a => !aliveSet.has(a.player.phone));
          if (deadPlayers.length > 0) {
            let deadCell = new UITableRow();
            deadCell.isHeader = true; deadCell.addText("Éliminés :").titleFont = Font.boldSystemFont(18);
            table.addRow(deadCell);

            deadPlayers.forEach(assign => {
              let name = assign.player.pseudo || assign.player.name;
              let roleColor = assign.role === "Infiltré" ? Color.red() : assign.role === "Civil" ? Color.blue() : Color.dynamic(Color.darkGray(), Color.white());
              let row = new UITableRow();
              row.height = 55;
              let cell = row.addText("💀 " + name, `est éliminé(e) (${assign.role} ${assign.emoji})`);
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
//  LOGIQUE DU JEU : DISTRIBUTION & ÉLIMINATION
// ─────────────────────────────────────────────

async function launchGame() {
  let selectedPlayers = appState.players.filter(p => appState.game.selected.has(p.phone));
  let effInfil = appState.game.nbInfil === -1 ? Math.ceil(selectedPlayers.length * 0.25) : appState.game.nbInfil;
  let effMW = appState.game.nbMW;

  const pool = loadWordPool(sessionConfig.activeListName);
  if (pool.missing) {
    let w = new Alert();
    w.title = "⚠️ Liste introuvable";
    w.message = `La liste « ${sessionConfig.activeListName} » est absente ou invalide : la liste embarquée sera utilisée.\n\nAstuce : Configuration avancée > Changer de liste > Mettre à jour les listes officielles.`;
    w.addAction("OK"); await w.presentAlert();
  }

  let pair = pickPair(pool);
  if (!pair) {
    let a = new Alert();
    a.title = "📭 Tous les mots ont été utilisés";
    a.message = `Les ${pool.groups.length} groupes de mots de « ${pool.label} » ont tous été joués au cours des parties précédentes.\n\nRéinitialisez la liste blanche pour les remettre en jeu, ou choisissez une autre liste.`;
    a.addDestructiveAction("Réinitialiser la liste blanche");
    a.addCancelAction("Annuler");
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
    let a = new Alert(); a.title = "🐛 DEBUG (Pas d'envoi)"; a.message = lines.join("\n"); a.addAction("OK"); await a.presentAlert();
    appState.view = "playing";
    return;
  }

  let a = new Alert(); a.title = "📤 Démarrage";
  a.addAction("📱 Via SMS"); a.addAction("📋 Sur cet écran");
  let c = await a.presentAlert();
  appState.game.method = c === 0 ? "sms" : "screen";
  startGameLog();

  if (c === 0) await sendInitialSMS();
  else await showOnScreen();
  logEvent("Distribution des mots terminée");

  appState.view = "playing";
}

// Rôles tirés uniformément, puis ordre de distribution mélangé indépendamment des rôles.
function assignRoles(players, nbInfil, nbMW, pair) {
  const assignments = shuffle(players).map((player, i) => {
    let role = i < nbMW ? "Mister White" : i < nbMW + nbInfil ? "Infiltré" : "Civil";
    let word = role === "Mister White" ? null : role === "Infiltré" ? pair.undercover : pair.civil;
    let emoji = role === "Mister White" ? "👻" : role === "Infiltré" ? "🕵️" : "🙂";
    return { player, role, word, emoji };
  });
  return shuffle(assignments);
}

// Ordre de parole aléatoire, Mister White ne parle jamais en premier (règle officielle).
function buildTurnOrder(phones) {
  const order = shuffle(phones);
  const isMW = phone => appState.game.assignments.find(a => a.player.phone === phone).role === "Mister White";
  const k = order.findIndex(phone => !isMW(phone));
  if (k > 0) [order[0], order[k]] = [order[k], order[0]];
  return order;
}

// ─────────────────────────────────────────────
// GESTION DES ÉLIMINATIONS
// ─────────────────────────────────────────────

async function executeElimination(killedPhone) {
  let killed = appState.game.assignments.find(x => x.player.phone === killedPhone);
  if (!killed) return;
  
  appState.game.alive = appState.game.alive.filter(phone => phone !== killed.player.phone);
  logEvent(`Manche ${appState.game.round} : ${playerLabel(killed.player)} est éliminé(e) — ${killed.role}`);

  if (killed.role === "Mister White") {
    let mwAlert = new Alert();
    mwAlert.title = "👻 Mr. White est éliminé !";
    mwAlert.message = "A-t-il deviné le mot des Civils ?";
    mwAlert.addAction("Oui (Victoire Mr. White)");
    mwAlert.addAction("Non (Il meurt)");
    let guessed = await mwAlert.presentAlert() === 0;
    logEvent(`Mister White ${guessed ? "a deviné" : "n'a pas deviné"} le mot des Civils`);
    if (guessed) {
      computeEndGameStats("mrwhite", killed);
      return;
    }
  }

  let cCount = 0, iCount = 0, mwCount = 0;
  appState.game.alive.forEach(phone => {
    let r = appState.game.assignments.find(x => x.player.phone === phone).role;
    if (r === "Civil") cCount++;
    else if (r === "Infiltré") iCount++;
    else if (r === "Mister White") mwCount++;
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
  logEvent(`Manche ${appState.game.round} — ordre de parole : ${turnOrderLabel()}`);
  
  if (!DEBUG_MODE) await notifyElimination(killed);
}

async function notifyElimination(killed) {
  let pName = killed.player.pseudo || killed.player.name;
  
  if (appState.game.method === "screen") {
    let a = new Alert(); a.title = "💀 Élimination";
    a.message = `${pName} est éliminé(e) !\nC'était un(e) ${killed.role} ${killed.emoji}`;
    a.addAction("OK"); await a.presentAlert();
  } else {
    let msgKilled = `💀 Tu as été éliminé(e) !\nTon rôle était : ${killed.role} ${killed.emoji}`;
    let alert1 = new Alert(); alert1.title = `📤 SMS Victime : ${pName}`;
    alert1.addAction("Ouvrir Messages"); alert1.addCancelAction("Passer");
    if (await alert1.presentAlert() === 0) {
      Safari.openInApp(`sms:${killed.player.phone}&body=${encodeURIComponent(msgKilled)}`, false);
      await pause(1500);
    }
    
    let msgGroup = `💀 ${pName} a été éliminé(e) !\nC'était un(e) ${killed.role} ${killed.emoji}\nLa partie continue.`;
    let phones = appState.game.alive.join(",");
    let alert2 = new Alert(); alert2.title = `📤 SMS de groupe (Survivants)`;
    alert2.addAction("Envoyer aux survivants"); alert2.addCancelAction("Passer");
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
    let roleKey = a.role === "Civil" ? "civil" : a.role === "Infiltré" ? "infiltre" : "mrwhite";
    let isWin = false;
    if (winnerType === "civils" && a.role === "Civil") isWin = true;
    else if (winnerType === "infiltres" && (a.role === "Infiltré" || a.role === "Mister White")) isWin = true;
    else if (winnerType === "mrwhite" && a.role === "Mister White" && a.player.phone === (mrWhiteAssign ? mrWhiteAssign.player.phone : null)) isWin = true;
    
    updateStats(a.player.phone, roleKey, isWin);
  });
  
  if (winnerType === "civils") {
    appState.game.assignments.forEach(a => { if(a.role === "Civil") { addScore(a.player.phone, 2); } });
  } 
  else if (winnerType === "infiltres") {
    appState.game.assignments.forEach(a => { 
      if(a.role === "Infiltré") { addScore(a.player.phone, 10); }
      if(a.role === "Mister White") { addScore(a.player.phone, 6); }
    });
  } 
  else if (winnerType === "mrwhite") {
    addScore(mrWhiteAssign ? mrWhiteAssign.player.phone : null, 6);
  }

  savePlayers();

  const results = { civils: "Victoire des Civils", infiltres: "Victoire des Infiltrés / Mister White", mrwhite: "Victoire de Mister White (mot deviné)" };
  const points = { civils: { "Civil": 2 }, infiltres: { "Infiltré": 10, "Mister White": 6 }, mrwhite: {} }[winnerType];
  const scored = appState.game.assignments
    .map(a => ({ a, pts: winnerType === "mrwhite" ? (a === mrWhiteAssign ? 6 : 0) : (points[a.role] || 0) }))
    .filter(x => x.pts > 0)
    .map(x => `${playerLabel(x.a.player)} +${x.pts}`);
  const survivors = appState.game.assignments.filter(a => appState.game.alive.includes(a.player.phone)).map(a => playerLabel(a.player));
  endGameLog(`Fin de partie après ${appState.game.round} manche(s)`, ["", `RÉSULTAT : ${results[winnerType]}`, `Survivants : ${survivors.join(", ") || "aucun"}`, `Points : ${scored.join(", ") || "aucun"}`]);
}

async function showEndGameSummary() {
  let title = "🎉 FIN DE PARTIE";
  let msg = "";
  let winnerType = appState.game.winnerType;
  let mrWhiteAssign = appState.game.mrWhiteAssign;

  if (winnerType === "civils") {
    msg = "Les Civils ont gagné ! Tous les imposteurs sont éliminés.\n(+2 pts par Civil)";
  } 
  else if (winnerType === "infiltres") {
    msg = "Les Infiltrés et Mr. White ont survécu ! Il ne reste qu'un Civil.\n(+10 pts Undercover / +6 pts Mr.White)";
  } 
  else if (winnerType === "mrwhite") {
    msg = "Mr. White a trouvé le mot et vole la victoire !\n(+6 pts pour lui)";
  }

  let pair = appState.game.pair;
  msg += `\n\n🔑 Mots secrets :\nCivil : ${pair.civil}\nUndercover : ${pair.undercover}`;

  let a = new Alert(); a.title = title; a.message = msg; a.addAction("Retour au menu");
  await a.presentAlert();
}

// ─────────────────────────────────────────────
// FONCTIONS DE COMMUNICATION INITIALES
// ─────────────────────────────────────────────

function buildMessage(assign) {
  let pseudoPart = (sessionConfig.showPseudoInMessage && assign.player.pseudo) ? `👤 Joueur : ${assign.player.pseudo}\n\n` : "";
  if (assign.role === "Mister White") return `🕵️ UNDERCOVER 🕵️\n\n${pseudoPart}Mister White\nVous n'avez pas de mot.\n\nBluffez, restez discret(e) et trouvez le mot secret !`;
  let rolePart = sessionConfig.showRoleInMessage ? `${assign.emoji} Rôle : ${assign.role}\n\n` : "";
  return `🕵️ UNDERCOVER 🕵️\n\n${pseudoPart}${rolePart}🔑 Votre mot : « ${assign.word} »\n\nNe le révélez à personne !`;
}

async function sendInitialSMS() {
  let as = appState.game.assignments;
  for (let i = 0; i < as.length; i++) {
    let a = new Alert(); a.title = `📤 SMS initial ${i + 1}/${as.length}`; a.message = `Destinataire : ${as[i].player.name}`;
    a.addAction("Ouvrir Messages"); a.addAction("Passer"); a.addCancelAction("Arrêter");
    let c = await a.presentAlert();
    if (c === -1) { logEvent("Envoi des SMS interrompu"); break; }
    if (c === 0) { Safari.openInApp(`sms:${as[i].player.phone}&body=${encodeURIComponent(buildMessage(as[i]))}`, false); await pause(1500); }
    else logEvent(`SMS non envoyé à ${playerLabel(as[i].player)}`);
  }
}

// Pour chaque joueur : on annonce d'abord à qui donner le téléphone, et le mot
// n'apparaît qu'une fois que ce joueur a confirmé qu'il tient l'appareil.
async function showOnScreen() {
  let as = appState.game.assignments;
  for (let i = 0; i < as.length; i++) {
    let name = as[i].player.name + (as[i].player.pseudo ? ` (${as[i].player.pseudo})` : "");

    let t = new Alert();
    t.title = `📱 Joueur ${i + 1}/${as.length}`;
    t.message = `Passez le téléphone à :\n\n${name}\n\nLes autres joueurs ne doivent pas regarder l'écran.`;
    t.addAction(`Je suis ${as[i].player.name}, voir mon mot`);
    await t.presentAlert();

    let a = new Alert();
    a.title = `🤫 ${as[i].player.name}`;
    a.message = buildMessage(as[i]);
    a.addAction("J'ai lu ✓ (masquer)");
    await a.presentAlert();
  }

  let first = appState.game.assignments.find(x => x.player.phone === appState.game.turnOrder[0]);
  let end = new Alert();
  end.title = "✅ Distribution terminée";
  end.message = `Rendez le téléphone au maître du jeu.\n\n${first.player.pseudo || first.player.name} commence la manche 1.`;
  end.addAction("Commencer la partie");
  await end.presentAlert();
}

// ─────────────────────────────────────────────
//  BOUCLE PRINCIPALE
// ─────────────────────────────────────────────

async function main() {
  ensureStorage();
  await prefetchStorage();
  loadConfig();
  appState.players = loadPlayers();

  // Première installation ou mise à jour : la liste active n'est pas encore sur l'appareil.
  if (sessionConfig.activeListName && !getFM().fileExists(listFilePath(sessionConfig.activeListName))) {
    await syncRemoteLists();
  }
  
  while(true) {
    let action = await startApp();
    if (action === "quit") {
      if (appState.view === "playing" && appState.game.status === "playing") endGameLog(`Application fermée pendant la manche ${appState.game.round}`);
      break;
    }
    if (action === "launch") await launchGame();
  }
}

await main();