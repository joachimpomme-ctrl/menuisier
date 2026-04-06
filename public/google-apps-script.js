// =============================================================================
// Menuisier — Google Apps Script pour sync cloud
// =============================================================================
// INSTALLATION :
// 1. Creer un Google Sheet "Menuisier — Projets"
// 2. Extensions > Apps Script
// 3. Coller ce code dans Code.gs
// 4. Deployer > Nouveau deploiement > Application Web
//    - Executer en tant que : Moi
//    - Acces : Tout le monde (ou "Tout le monde avec le lien")
// 5. Copier l'URL du deploiement et la coller dans Menuisier > Reglages cloud
// =============================================================================

const SHEET_NAME = 'Projets';

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'name', 'materialShort', 'bodyCount', 'createdAt', 'updatedAt', 'json']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) return i + 1; // 1-indexed
  }
  return -1;
}

// --- GET : list all projects or load one ---
function doGet(e) {
  const sheet = getOrCreateSheet();
  const action = (e && e.parameter && e.parameter.action) || 'list';

  if (action === 'load') {
    const id = e.parameter.id;
    if (!id) return json({ error: 'Missing id' }, 400);
    const row = findRow(sheet, id);
    if (row === -1) return json({ error: 'Not found' }, 404);
    const values = sheet.getRange(row, 1, 1, 7).getValues()[0];
    return json({
      id: values[0],
      name: values[1],
      json: values[6],
    });
  }

  // Default: list
  const data = sheet.getDataRange().getValues();
  const projects = [];
  for (let i = 1; i < data.length; i++) {
    projects.push({
      id: data[i][0],
      name: data[i][1],
      materialShort: data[i][2],
      bodyCount: data[i][3],
      createdAt: data[i][4],
      updatedAt: data[i][5],
    });
  }
  return json({ projects: projects });
}

// --- POST : save or delete a project ---
function doPost(e) {
  const sheet = getOrCreateSheet();
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const action = body.action || 'save';

  if (action === 'delete') {
    const id = body.id;
    if (!id) return json({ error: 'Missing id' }, 400);
    const row = findRow(sheet, id);
    if (row > 0) sheet.deleteRow(row);
    return json({ ok: true });
  }

  // Default: save
  const id = body.id;
  const name = body.name || 'Sans nom';
  const materialShort = body.materialShort || '?';
  const bodyCount = body.bodyCount || 0;
  const now = new Date().toISOString();
  const jsonStr = body.json || '{}';

  const row = findRow(sheet, id);
  if (row > 0) {
    // Update
    sheet.getRange(row, 2, 1, 6).setValues([[name, materialShort, bodyCount, sheet.getRange(row, 5).getValue(), now, jsonStr]]);
  } else {
    // Insert
    sheet.appendRow([id, name, materialShort, bodyCount, now, now, jsonStr]);
  }

  return json({ ok: true, id: id });
}

function json(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
