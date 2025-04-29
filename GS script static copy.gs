// ---------- SETTINGS ----------
const MAIN_SHEET     = 'data';     // data source
const PROMPTS_SHEET  = 'prompts';    // will be created automatically
// --------------------------------

/* GET  /exec
   ├─ no params           → JSON of all columns/values
   └─ ?latest=1           → { prompt:"…" }  (latest concatenation)          */
function doGet(e) {
  if (e.parameters.latest) {
    return _json({ prompt: _latestPrompt() });
  }

  const sh      = SpreadsheetApp.getActive().getSheetByName(MAIN_SHEET);
  const rows    = sh.getDataRange().getValues();
  const headers = rows.shift();

  const out = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const [name, tag=''] = h.split('(');
    const type = /multi/i.test(tag) ? 'multiple' : 'single';
    const items = rows.map(r => r[i]).filter(String);
    out[name.trim()] = { type, items };
  });
  return _json(out);
}

/* POST /exec
   ├─ { column:"Tone", value:"Playful" }   → add option to sheet
   └─ { prompt:"…concatenated text…" }     → log + cache latest prompt     */
function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');

  // 1) Save a generated prompt -----------------------------
  if (body.prompt) {
    _appendPrompt(body.prompt);
    return _json({ status:'ok' });
  }

  // 2) Add new option to a column --------------------------
  const { column, value } = body;
  if (!column || !value) return _err('column & value required');

  const sh       = SpreadsheetApp.getActive().getSheetByName(MAIN_SHEET);
  const headers  = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const idx      = headers.findIndex(h => h.split('(')[0].trim() === column);
  if (idx === -1) return _err(`Column “${column}” not found`);

  const blank    = Array(headers.length).fill('');
  blank[idx]     = value;
  sh.appendRow(blank);
  return _json({ status:'ok' });
}

// ---------- helpers --------------------------------------
function _json(o){return ContentService.createTextOutput(JSON.stringify(o))
                 .setMimeType(ContentService.MimeType.JSON);}
function _err(m){return _json({ error:m });}

function _appendPrompt(str){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(PROMPTS_SHEET) || ss.insertSheet(PROMPTS_SHEET);
  sh.appendRow([new Date(), str]);          // log
  sh.getRange('A1').setValue(str);          // cache “latest”
}
function _latestPrompt(){
  const sh = SpreadsheetApp.getActive().getSheetByName(PROMPTS_SHEET);
  return sh ? (sh.getRange('A1').getValue() || '') : '';
}