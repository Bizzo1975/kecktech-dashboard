'use strict';
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { exec } = require('child_process');
const multer  = require('multer');

const DATA_DIR    = process.env.DATA_DIR    || '/website/src/data';
const WEBSITE_DIR = process.env.WEBSITE_DIR || '/website';
const IMAGES_DIR  = path.join(WEBSITE_DIR, 'public', 'images');
const PORT        = process.env.PORT        || 3000;

const PAGES = ['home', 'about', 'services', 'pricing', 'contact', 'global'];

const NAV_ICONS = { home: '🏠', about: '👥', services: '⚙️', pricing: '💰', contact: '✉️', global: '🌐' };

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Photo upload ──────────────────────────────────────────────────────────────

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage: photoStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Helpers ───────────────────────────────────────────────────────────────────

function readData(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
}

function writeData(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function humanLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

const SECTION_LABELS = {
  hero: "Hero Section",
  about: "About Section",
  services: "Services Section",
  pricing: "Pricing Section",
  contact: "Contact Section",
  nav: "Navigation",
  footer: "Footer",
  cta: "Call To Action",
  testimonials: "Testimonials",
  faq: "FAQ",
};

function prettySectionLabel(raw) {
  const key = String(raw || "").toLowerCase();
  return SECTION_LABELS[key] || humanLabel(raw);
}

function isPhotoField(name) {
  const parts = name.split(/[\[\].]+/).filter(Boolean);
  return parts[parts.length - 1] === 'photo';
}

function renderPhotoField(val, name, id) {
  const uploadId   = `upload_${id}`;
  const previewHtml = val
    ? `<img src="${esc(val)}" class="photo-preview" alt="Current photo" onerror="this.style.display='none'" />`
    : `<div class="photo-placeholder"><span>No photo set</span></div>`;

  return `
<div class="field photo-field">
  <label>Photo</label>
  <div class="photo-widget">
    ${previewHtml}
    <div class="photo-controls">
      <input type="text" id="${id}" name="${esc(name)}" value="${esc(val)}"
        class="photo-path" placeholder="/images/filename.jpg" />
      <label class="btn btn-secondary btn-upload" for="${uploadId}">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
        Browse &amp; Upload
      </label>
      <input type="file" id="${uploadId}" class="photo-upload-input"
        accept="image/jpeg,image/png,image/webp,image/gif"
        data-path-field="${id}" style="display:none" />
      <p class="photo-hint">Max 10 MB · JPG, PNG, or WebP</p>
    </div>
  </div>
</div>`;
}

// Recursively render form fields from a JSON value
function renderFields(val, name, depth = 0) {
  if (val === null || val === undefined) return '';

  if (typeof val === 'boolean') {
    const id = name.replace(/[\[\].]/g, '_');
    const parts = name.split(/[\[\].]+/).filter(Boolean);
    const label = humanLabel(parts[parts.length - 1] || name);
    return `<div class="field field-toggle">
      <label for="${id}">${esc(label)}</label>
      <label class="toggle-switch">
        <input type="checkbox" id="${id}" name="${esc(name)}" value="true" ${val ? 'checked' : ''} />
        <span class="toggle-slider"></span>
      </label>
      <input type="hidden" name="${esc(name)}__type" value="boolean" />
    </div>`;
  }

  if (typeof val === 'number') {
    return `<input type="hidden" name="${esc(name)}" value="${val}" />`;
  }

  if (typeof val === 'string') {
    const id    = name.replace(/[\[\].]/g, '_');
    const label = humanLabel(name.split(/[\[\].]+/).filter(Boolean).pop() || name);

    if (isPhotoField(name)) return renderPhotoField(val, name, id);

    const isLong = val.length > 100 || val.includes('\n');
    const inputHtml = isLong
      ? `<textarea id="${id}" name="${esc(name)}" rows="${Math.max(3, Math.ceil(val.length / 80))}">${esc(val)}</textarea>`
      : `<input type="text" id="${id}" name="${esc(name)}" value="${esc(val)}" />`;
    return `<div class="field"><label for="${id}">${esc(label)}</label>${inputHtml}</div>`;
  }

  // --- STRING ARRAY EDITOR (features lists, etc.) ---
  if (Array.isArray(val) && val.length > 0 && val.every(i => typeof i === 'string')) {
    const parts = name.split(/[\[\].]+/).filter(Boolean);
    const label = humanLabel(parts[parts.length - 1] || name);
    const id = name.replace(/[\[\].]/g, '_');
    let rows = val.map((item, idx) => {
      const rowName = `${name}[${idx}]`;
      const rowId = `${id}_${idx}`;
      return `<div class="string-array-row" data-array="${esc(id)}">
        <span class="string-array-index">${idx + 1}.</span>
        <input type="text" id="${rowId}" name="${esc(rowName)}" value="${esc(item)}" />
        <button type="button" class="btn-remove-row" onclick="removeArrayRow(this)" title="Remove">&times;</button>
      </div>`;
    }).join('\n');

    return `<div class="field field-string-array">
      <label>${esc(label)}</label>
      <div class="string-array-container" id="container_${id}" data-base-name="${esc(name)}">
        ${rows}
      </div>
      <button type="button" class="btn-add-row" onclick="addArrayRow('container_${id}', '${esc(name)}')">+ Add Item</button>
      <input type="hidden" name="${esc(name)}__type" value="string_array" />
    </div>`;
  }

  if (Array.isArray(val)) {
    const label = prettySectionLabel(name.split(/[\[\].]+/).filter(Boolean).pop() || name);
    let html = `<details class="array-section accordion-section"${depth <= 1 ? ' open' : ''}><summary class="accordion-summary">${esc(label)}</summary><div class="accordion-content">`;
    val.forEach((item, i) => {
      if (typeof item === 'object' && !Array.isArray(item)) {
        const itemLabel = item.name || item.heading || item.title || item.id || `Item ${i + 1}`;
        html += `<fieldset class="array-item"><legend>${esc(itemLabel)}</legend>`;
        html += renderFields(item, `${name}[${i}]`, depth + 1);
        html += `</fieldset>`;
      } else {
        html += renderFields(item, `${name}[${i}]`, depth + 1);
      }
    });
    html += `</div></details>`;
    return html;
  }

  if (typeof val === 'object') {
    const label = name ? prettySectionLabel(name.split(/[\[\].]+/).filter(Boolean).pop() || name) : '';
    const wrapperStart = label && depth > 0
      ? `<details class="obj-section accordion-section"${depth === 1 ? ' open' : ''}><summary class="accordion-summary">${esc(label)}</summary><div class="accordion-content">`
      : '<div class="obj-section">';
    let html = wrapperStart;
    for (const [k, v] of Object.entries(val)) {
      html += renderFields(v, name ? `${name}[${k}]` : k, depth + 1);
    }
    html += label && depth > 0 ? '</div></details>' : '</div>';
    return html;
  }

  return '';
}

// Recursively merge form body back into original structure (preserving types)
function mergeFormData(original, submitted) {
  if (original === null || original === undefined) return submitted;

  // Boolean fields: checkbox present → true, absent → false
  // The __type=boolean hidden input tells us this was a boolean field
  if (typeof original === 'boolean') {
    if (submitted === 'true' || submitted === true) return true;
    if (submitted === 'false' || submitted === false) return false;
    // Unchecked checkbox: key absent from form body → default false
    return false;
  }

  if (typeof original === 'number') return Number(submitted);
  if (typeof original === 'string') return typeof submitted === 'string' ? submitted : original;

  if (Array.isArray(original)) {
    // String array: reconstruct from indexed form keys
    if (original.length > 0 && original.every(i => typeof i === 'string')) {
      if (!submitted || typeof submitted !== 'object') return original;
      // Submitted comes as { '0': 'val', '1': 'val', ... }
      const result = [];
      let i = 0;
      while (submitted[String(i)] !== undefined) {
        const val = String(submitted[String(i)]).trim();
        if (val) result.push(val);
        i++;
      }
      return result.length > 0 ? result : original;
    }

    if (!submitted || !Array.isArray(submitted)) return original;
    return original.map((item, i) =>
      submitted[i] === undefined ? item : mergeFormData(item, submitted[i])
    );
  }

  if (typeof original === 'object') {
    const result = {};
    for (const key of Object.keys(original)) {
      // Skip __type helper keys
      if (key.endsWith('__type')) continue;
      result[key] = submitted && submitted[key] !== undefined
        ? mergeFormData(original[key], submitted[key])
        : original[key];
    }
    return result;
  }
  return submitted;
}

// ── Layout ────────────────────────────────────────────────────────────────────

function layout(title, body, page = '') {
  const navLinks = PAGES.map(p => {
    const label = p.charAt(0).toUpperCase() + p.slice(1);
    const icon  = NAV_ICONS[p] || '📄';
    return `<a href="/page/${p}" class="nav-link${p === page ? ' active' : ''}">
      <span class="nav-icon">${icon}</span>${label}
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — Kecktech Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div class="admin-shell">

    <!-- ── Sidebar ── -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-keck">Keck</span><span class="brand-tech">tech</span>
        <span class="brand-label">Content Admin</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Pages</div>
        ${navLinks}
      </nav>
      <div class="sidebar-footer">
        <a href="https://www.kecktech.net" target="_blank" rel="noopener" class="sidebar-site-link">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          View Live Site
        </a>
        <br/>
        <a href="https://portal.kecktech.net" target="_blank" rel="noopener" class="sidebar-site-link" style="margin-top:8px;display:inline-flex;">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Customer Portal
        </a>
      </div>
    </aside>

    <!-- ── Content ── -->
    <div class="content-area">
      <main class="content-main">
        ${body}
      </main>
    </div>

  </div>

  <script>
    /* ── String array add/remove ── */
    function removeArrayRow(btn) {
      var row = btn.closest('.string-array-row');
      var container = row.parentElement;
      row.remove();
      reindexArrayRows(container);
    }

    function addArrayRow(containerId, baseName) {
      var container = document.getElementById(containerId);
      var rows = container.querySelectorAll('.string-array-row');
      var idx = rows.length;
      var div = document.createElement('div');
      div.className = 'string-array-row';
      div.innerHTML = '<span class="string-array-index">' + (idx + 1) + '.</span>'
        + '<input type="text" name="' + baseName + '[' + idx + ']" value="" placeholder="New item..." />'
        + '<button type="button" class="btn-remove-row" onclick="removeArrayRow(this)" title="Remove">&times;</button>';
      container.appendChild(div);
    }

    function reindexArrayRows(container) {
      var baseName = container.dataset.baseName;
      var rows = container.querySelectorAll('.string-array-row');
      rows.forEach(function(row, idx) {
        row.querySelector('.string-array-index').textContent = (idx + 1) + '.';
        var input = row.querySelector('input[type="text"]');
        input.name = baseName + '[' + idx + ']';
      });
    }

    /* ── Photo upload handler ── */
    document.addEventListener('change', function(e) {
      const input = e.target;
      if (!input.classList.contains('photo-upload-input')) return;
      const file = input.files && input.files[0];
      if (!file) return;

      const pathFieldId = input.dataset.pathField;
      const pathField   = document.getElementById(pathFieldId);
      const widget      = input.closest('.photo-widget');
      const preview     = widget && widget.querySelector('.photo-preview');
      const placeholder = widget && widget.querySelector('.photo-placeholder');
      const label       = input.previousElementSibling;

      if (label) label.textContent = 'Uploading…';

      const formData = new FormData();
      formData.append('photo', file);

      fetch('/upload/photo', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
          if (data.path) {
            pathField.value = data.path;
            if (preview) {
              preview.src   = data.path;
              preview.style.display = '';
            } else if (placeholder) {
              placeholder.insertAdjacentHTML(
                'beforebegin',
                '<img src="' + data.path + '" class="photo-preview" alt="Photo" />'
              );
              placeholder.remove();
            }
          }
          if (label) label.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Browse &amp; Upload';
        })
        .catch(() => {
          if (label) label.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> Browse &amp; Upload';
          alert('Upload failed. Please check file size (max 10 MB) and try again.');
        });
    });
  </script>
</body>
</html>`;
}

// ── Build state ───────────────────────────────────────────────────────────────

let buildState = { running: false, log: '', exitCode: null };

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.redirect('/page/home'));

app.get('/page/:name', (req, res) => {
  const { name } = req.params;
  if (!PAGES.includes(name)) {
    return res.status(404).send(layout('Not Found', '<p class="not-found">Page not found.</p>'));
  }

  const data  = readData(name);
  const saved = req.query.saved === '1';
  const fields = renderFields(data, '');

  // Homepage service card selector
  let serviceSelectorHtml = '';
  if (name === 'home') {
    try {
      const servicesData = readData('services');
      const allServices = (servicesData.services || []);
      const currentIds = data.services?.displayIds || [];

      serviceSelectorHtml = `
        <fieldset class="service-selector">
          <legend>Homepage Service Cards</legend>
          <p class="selector-help">Check services to display on the homepage. Toggle availability in the Services page.</p>
          ${allServices.map(svc => {
            const checked = currentIds.includes(svc.id) ? 'checked' : '';
            const unavailable = svc.available === false ? ' (unavailable)' : '';
            return `<label class="service-checkbox${svc.available === false ? ' service-unavailable' : ''}">
              <input type="checkbox" name="__displayIds__" value="${esc(svc.id)}" ${checked} />
              <span class="service-checkbox-label">${esc(svc.name)}${unavailable}</span>
              <span class="service-checkbox-rate">${esc(svc.price || '')}</span>
            </label>`;
          }).join('\n')}
        </fieldset>
      `;
    } catch (e) { /* services.json not found, skip */ }
  }

  const body = `
    ${saved ? `<div class="alert alert-success">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Saved successfully — click <strong>Rebuild &amp; Publish</strong> to push live.
    </div>` : ''}

    <div class="page-header">
      <div class="page-title">
        <div class="page-title-eyebrow">Editing</div>
        <h1>${esc(name.charAt(0).toUpperCase() + name.slice(1))}</h1>
      </div>
      <div class="page-actions">
        <a href="/preview/${esc(name)}" target="_blank" rel="noopener" class="btn btn-secondary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          Preview Draft
        </a>
        <form method="POST" action="/build" id="build-form">
          <button type="submit" class="btn btn-build" id="build-btn">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Rebuild &amp; Publish
          </button>
        </form>
      </div>
    </div>

    <form method="POST" action="/save/${esc(name)}" class="edit-form">
      ${serviceSelectorHtml}
      ${fields}
      <div class="form-footer">
        <button type="submit" class="btn btn-save">Save Changes</button>
        <span class="save-note">Saving updates the data file. Use <strong>Rebuild &amp; Publish</strong> to go live.</span>
      </div>
    </form>

    <div class="build-log" id="build-log" hidden>
      <h3>
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Build Output
      </h3>
      <pre id="build-output"></pre>
    </div>

    <script>
      const buildBtn    = document.getElementById('build-btn');
      const buildLog    = document.getElementById('build-log');
      const buildOutput = document.getElementById('build-output');

      document.getElementById('build-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        buildBtn.disabled = true;
        buildBtn.innerHTML = '<svg width="15" height="15" class="spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Building…';
        buildLog.hidden = false;
        buildOutput.textContent = 'Starting build…';

        await fetch('/build', { method: 'POST' });

        const poll = setInterval(async () => {
          const res  = await fetch('/build/status');
          const data = await res.json();
          buildOutput.textContent = data.log || '…';
          if (!data.running) {
            clearInterval(poll);
            buildBtn.disabled = false;
            buildBtn.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Rebuild &amp; Publish';
            buildOutput.textContent += data.exitCode === 0
              ? '\\n\\n✅ Build complete! Site is live.'
              : '\\n\\n❌ Build failed. See output above.';
          }
        }, 1000);
      });
    </script>`;

  res.send(layout(`Edit ${name}`, body, name));
});

app.post('/save/:name', (req, res) => {
  const { name } = req.params;
  if (!PAGES.includes(name)) return res.status(404).send('Not found');
  const original = readData(name);
  const merged   = mergeFormData(original, req.body);

  // Handle homepage displayIds from service selector checkboxes
  if (name === 'home' && req.body['__displayIds__']) {
    let ids = req.body['__displayIds__'];
    if (!Array.isArray(ids)) ids = [ids];
    if (!merged.services) merged.services = {};
    merged.services.displayIds = ids;
  } else if (name === 'home' && !req.body['__displayIds__']) {
    // All unchecked — empty array
    if (!merged.services) merged.services = {};
    merged.services.displayIds = [];
  }

  writeData(name, merged);
  res.redirect(`/page/${name}?saved=1`);
});

app.get('/preview/:name', (req, res) => {
  const { name } = req.params;
  if (!PAGES.includes(name)) return res.status(404).send(layout('Preview not found', '<p class="not-found">Preview page not found.</p>'));
  const data = readData(name);
  const json = esc(JSON.stringify(data, null, 2));
  const body = `
    <div class="page-header">
      <div class="page-title">
        <div class="page-title-eyebrow">Preview</div>
        <h1>${esc(name.charAt(0).toUpperCase() + name.slice(1))} Draft Data</h1>
      </div>
      <div class="page-actions">
        <a href="/page/${esc(name)}" class="btn btn-secondary">Back to Editor</a>
      </div>
    </div>
    <div class="build-log">
      <h3>Draft JSON Preview</h3>
      <pre>${json}</pre>
    </div>`;
  res.send(layout(`Preview ${name}`, body, name));
});

app.post('/upload/photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ path: `/images/${req.file.filename}` });
});

app.post('/build', (req, res) => {
  if (buildState.running) {
    return res.json({ started: false, error: 'Build already running' });
  }
  buildState = { running: true, log: 'Starting build…\n', exitCode: null };
  exec('npm run build', { cwd: WEBSITE_DIR }, (err, stdout, stderr) => {
    buildState.running  = false;
    buildState.log      = (stdout || '') + (stderr || '');
    buildState.exitCode = err ? (err.code || 1) : 0;
  });
  res.json({ started: true });
});

app.get('/build/status', (req, res) => res.json(buildState));

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Kecktech Admin running on port ${PORT}`);
  console.log(`DATA_DIR:    ${DATA_DIR}`);
  console.log(`WEBSITE_DIR: ${WEBSITE_DIR}`);
  console.log(`IMAGES_DIR:  ${IMAGES_DIR}`);
});
