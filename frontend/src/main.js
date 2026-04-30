/* Company Editor — Frontend logic */

var appState = {
    directory: '',
    filename: '',
    company: null,
    modified: false,
    filepath: '',
};

function getState() { return appState; }

function setState(partial) {
    Object.assign(appState, partial);
    render();
}

function init() {
    bindEvents();
    // Check if launched with a file — if so, load its data
    fetch('/api/open').then(function(r) { return r.json(); }).then(function(data) {
        if (data.ok && data.data && data.data.company) {
            var d = data.data;
            appState.company = d.company;
            appState.directory = d.directory;
            appState.filename = d.filename;
            appState.filepath = d.filepath;
            appState.modified = false;
        }
        render();
    }).catch(function() {
        render();
    });
}

// ========== RENDER ==========

function render() {
    var isOpen = appState.company !== null;

    // Update filename display
    if (document.getElementById('editor-filename'))
        document.getElementById('editor-filename').textContent = appState.filename || 'New Company';
    var badge = document.getElementById('editor-modified');
    if (badge) badge.style.display = appState.modified ? '' : 'none';

    renderCompanyForm();
}

function renderCompanyForm() {
    var c = appState.company || {
        name: '', address: '', website: '', company_type: '',
        emails: [], phones: [], contacts: []
    };

    var html = '';

    // Company info
    html += '<div class="section-header">🏢 Company Information</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group" style="flex:2"><label>Company Name</label><input type="text" id="comp-name-input" value="' + escapeHtml(c.name) + '" /></div>';
    html += '<div class="form-group" style="flex:1"><label>Website</label><div style="display:flex;gap:4px"><input type="text" id="comp-website-input" value="' + escapeHtml(c.website || '') + '" style="flex:1" />' + (c.website ? '<button class="btn btn-xs" data-action="open-uri" data-uri="' + escapeHtml(c.website) + '" title="Open in browser" style="font-size:12px">🌐</button>' : '') + '</div></div>';
    html += '</div>';

    html += '<div class="form-row">';
    html += '<div class="form-group" style="flex:1"><label>Company Type</label>';
    html += '<select id="comp-type-select" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-input);color:var(--text-primary);font-size:13px;appearance:none;-webkit-appearance:none">';
    var types = ['', 'customer', 'supplier', 'shipping_company', 'bank', 'post_office', 'other'];
    var currentType = c.company_type || '';
    types.forEach(function(t) {
        var label = t ? t.replace(/_/g, ' ').replace(/\b\w/g, function(s) { return s.toUpperCase(); }) : '— Select Type —';
        html += '<option value="' + escapeHtml(t) + '"' + (currentType === t ? ' selected' : '') + ' style="background:var(--bg-surface);color:var(--text-primary)">' + escapeHtml(label) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group" style="flex:2"><label>Address</label><input type="text" id="comp-address-input" value="' + escapeHtml(c.address || '') + '" /></div>';
    html += '</div>';

    // Emails and Phones
    html += '<div class="form-row" style="gap:16px">';
    html += '<div class="form-group" style="flex:1"><label>Emails</label>';
    html += '<div id="comp-emails-list">';
    if (c.emails && c.emails.length > 0) {
        c.emails.forEach(function(email, idx) {
            html += '<div class="contact-field-row"><input type="text" class="comp-email-input" value="' + escapeHtml(email) + '" data-idx="' + idx + '" placeholder="email@example.com" /><button class="btn btn-xs" data-action="open-uri" data-uri="mailto:' + escapeHtml(email) + '" title="Send email" style="font-size:12px">✉️</button><button class="btn btn-xs btn-danger" data-action="remove-email" data-idx="' + idx + '">✕</button></div>';
        });
    } else {
        html += '<div class="contact-field-row"><input type="text" class="comp-email-input" data-idx="0" placeholder="email@example.com" /></div>';
    }
    html += '</div>';
    html += '</div>';
    html += '<div class="form-group" style="flex:1"><label>Phones</label>';
    html += '<div id="comp-phones-list">';
    if (c.phones && c.phones.length > 0) {
        c.phones.forEach(function(phone, idx) {
            html += '<div class="contact-field-row"><input type="text" class="comp-phone-input" value="' + escapeHtml(phone) + '" data-idx="' + idx + '" placeholder="+123456789" /><button class="btn btn-xs" data-action="open-uri" data-uri="tel:' + escapeHtml(phone.replace(/[^+\d]/g, '')) + '" title="Call" style="font-size:12px">📞</button><button class="btn btn-xs btn-danger" data-action="remove-phone" data-idx="' + idx + '">✕</button></div>';
        });
    } else {
        html += '<div class="contact-field-row"><input type="text" class="comp-phone-input" data-idx="0" placeholder="+123456789" /></div>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Notes
    html += '<div class="form-group"><label>Notes</label>';
    html += '<textarea id="comp-notes-input" rows="2" style="width:100%;padding:6px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-input);color:var(--text-primary);resize:vertical">' + escapeHtml(c.notes || '') + '</textarea>';
    html += '</div>';

    // Contacts section
    html += '<div class="section-header" style="margin-top:24px">👤 Contacts</div>';

    if (c.contacts && c.contacts.length > 0) {
        html += '<div class="contacts-grid">';
        c.contacts.forEach(function(contact, idx) {
            html += '<div class="contact-card" data-contact-idx="' + idx + '">';
            html += '<div class="contact-header"><strong>' + escapeHtml(contact.fn || 'Unnamed') + '</strong>';
            html += '<div class="contact-actions">';
            html += '<button class="btn btn-xs" data-action="edit-contact" data-idx="' + idx + '">✏️</button>';
            html += '<button class="btn btn-xs btn-danger" data-action="delete-contact" data-idx="' + idx + '">🗑</button>';
            html += '</div></div>';
            if (contact.tel) html += '<div class="contact-detail">📞 <span class="contact-link" data-action="open-uri" data-uri="tel:' + escapeHtml(contact.tel.replace(/[^+\d]/g, '')) + '" style="cursor:pointer">' + escapeHtml(contact.tel) + '</span></div>';
            if (contact.email) html += '<div class="contact-detail">✉️ <span class="contact-link" data-action="open-uri" data-uri="mailto:' + escapeHtml(contact.email) + '" style="cursor:pointer">' + escapeHtml(contact.email) + '</span></div>';
            if (contact.org) html += '<div class="contact-detail">🏢 ' + escapeHtml(contact.org) + '</div>';
            if (contact.role) html += '<div class="contact-detail">🎯 ' + escapeHtml(contact.role) + '</div>';
            html += '</div>';
        });
        html += '</div>';
    } else {
        html += '<div class="empty-tab" style="padding:12px">No contacts yet.</div>';
    }



    // Contact editor form
    html += '<div id="contact-editor" style="display:none;margin-top:16px;padding:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius)">';
    html += '<div class="section-header" id="contact-editor-title">Add Contact</div>';
    html += '<div class="form-row"><div class="form-group"><label>Full Name *</label><input type="text" id="contact-fn-input" /></div>';
    html += '<div class="form-group"><label>Structured Name (n)</label><input type="text" id="contact-n-input" /></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Phone</label><input type="text" id="contact-tel-input" /></div>';
    html += '<div class="form-group"><label>Email</label><input type="text" id="contact-email-input" /></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Organization</label><input type="text" id="contact-org-input" /></div>';
    html += '<div class="form-group"><label>Role</label><input type="text" id="contact-role-input" /></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Job Title</label><input type="text" id="contact-title-input" /></div>';
    html += '<div class="form-group"><label>Address</label><input type="text" id="contact-adr-input" /></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>Note</label><input type="text" id="contact-note-input" /></div>';
    html += '<div class="form-group"><label>Birthday</label><input type="text" id="contact-bday-input" placeholder="YYYY-MM-DD" /></div></div>';
    html += '<div class="form-row"><div class="form-group"><label>URL</label><input type="text" id="contact-url-input" /></div>';
    html += '<div class="form-group"><label>Categories</label><input type="text" id="contact-categories-input" /></div></div>';
    html += '<div class="form-row" style="margin-top:12px">';
    html += '<button class="btn btn-primary" id="contact-save-btn">💾 Save Contact</button>';
    html += '<button class="btn" id="contact-cancel-btn">Cancel</button>';
    html += '<span id="contact-form-status" style="margin-left:12px;font-size:0.9em"></span>';
    html += '</div></div>';

    document.getElementById('editor-content').innerHTML = html;

    // Wire events

    document.getElementById('contact-save-btn').addEventListener('click', handleContactSave);
    document.getElementById('contact-cancel-btn').addEventListener('click', hideContactForm);
}

var _editingContactIdx = -1;

function showContactForm(idx) {
    _editingContactIdx = idx;
    var editor = document.getElementById('contact-editor');
    editor.style.display = 'block';
    document.getElementById('contact-editor-title').textContent = idx >= 0 ? 'Edit Contact' : 'Add Contact';

    var fields = ['fn', 'n', 'tel', 'email', 'org', 'role', 'title', 'adr', 'note', 'bday', 'url', 'categories'];
    fields.forEach(function(f) {
        var el = document.getElementById('contact-' + f + '-input');
        if (el) el.value = '';
    });

    if (idx >= 0 && appState.company && appState.company.contacts) {
        var contact = appState.company.contacts[idx];
        if (contact) {
            fields.forEach(function(f) {
                var el = document.getElementById('contact-' + f + '-input');
                if (el && contact[f] !== undefined) el.value = String(contact[f]);
            });
        }
    }

    document.getElementById('contact-form-status').textContent = '';
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideContactForm() {
    document.getElementById('contact-editor').style.display = 'none';
    _editingContactIdx = -1;
}

async function handleContactSave() {
    var fn = document.getElementById('contact-fn-input').value.trim();
    if (!fn) {
        document.getElementById('contact-form-status').textContent = '❌ Full name is required';
        return;
    }

    var contact = {
        fn: fn,
        n: document.getElementById('contact-n-input').value.trim(),
        tel: document.getElementById('contact-tel-input').value.trim(),
        email: document.getElementById('contact-email-input').value.trim(),
        org: document.getElementById('contact-org-input').value.trim(),
        role: document.getElementById('contact-role-input').value.trim(),
        title: document.getElementById('contact-title-input').value.trim(),
        adr: document.getElementById('contact-adr-input').value.trim(),
        note: document.getElementById('contact-note-input').value.trim(),
        bday: document.getElementById('contact-bday-input').value.trim(),
        url: document.getElementById('contact-url-input').value.trim(),
        categories: document.getElementById('contact-categories-input').value.trim(),
    };

    if (_editingContactIdx >= 0) {
        appState.company.contacts[_editingContactIdx] = contact;
    } else {
        appState.company.contacts.push(contact);
    }
    hideContactForm();
    appState.modified = true;
    render();
}

// ========== EVENT BINDING ==========

function bindEvents() {
    var body = document.body;

    body.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;

        switch (action) {
            case 'open-file':
                handleOpenFile();
                break;

            case 'open-uri':
                var uri = btn.dataset.uri;
                if (uri) openSystem(uri);
                break;
            case 'add-email':
                handleAddEmail();
                break;
            case 'add-phone':
                handleAddPhone();
                break;
            case 'remove-email':
                var emailIdx = parseInt(btn.dataset.idx);
                if (!isNaN(emailIdx)) {
                    var el = document.querySelector('.comp-email-input[data-idx="' + emailIdx + '"]');
                    if (el) el.parentElement.remove();
                    appState.modified = true;
                }
                break;
            case 'remove-phone':
                var phoneIdx = parseInt(btn.dataset.idx);
                if (!isNaN(phoneIdx)) {
                    var el = document.querySelector('.comp-phone-input[data-idx="' + phoneIdx + '"]');
                    if (el) el.parentElement.remove();
                    appState.modified = true;
                }
                break;
            case 'edit-contact':
                var contactIdx = parseInt(btn.dataset.idx);
                if (!isNaN(contactIdx)) showContactForm(contactIdx);
                break;
            case 'delete-contact':
                (async function() {
                    var cIdx = parseInt(btn.dataset.idx);
                    if (isNaN(cIdx)) return;
                    var confirmed = await _showConfirmDialog('Delete this contact?');
                    if (!confirmed) return;
                    appState.company.contacts.splice(cIdx, 1);
                    appState.modified = true;
                    render();
                })();
                break;
        }
    });

    // Start page buttons
    document.getElementById('btn-open-file').addEventListener('click', handleOpenFile);


    // Editor toolbar buttons
    document.getElementById('btn-open-file').addEventListener('click', handleOpenFile);
    var newBtn = document.getElementById('btn-new-company');
    if (newBtn) newBtn.addEventListener('click', handleNewCompany);
    document.getElementById('btn-save').addEventListener('click', handleSave);
    var addEmailBtn = document.getElementById('btn-add-email');
    if (addEmailBtn) addEmailBtn.addEventListener('click', handleAddEmail);
    var addPhoneBtn = document.getElementById('btn-add-phone');
    if (addPhoneBtn) addPhoneBtn.addEventListener('click', handleAddPhone);
    var addContactBtn = document.getElementById('btn-add-contact');
    if (addContactBtn) addContactBtn.addEventListener('click', function() { showContactForm(-1); });

    // Input change marks modified
    body.addEventListener('input', function(e) {
        if (e.target.closest('#editor-content') && !e.target.closest('#contact-editor')) {
            if (!appState.modified) {
                appState.modified = true;
                // Just update the modified badge without re-rendering the whole form
                var badge = document.getElementById('editor-modified');
                if (badge) badge.style.display = '';
            }
        }
    });

    // Drag and drop
    body.addEventListener('dragover', function(e) { e.preventDefault(); });
    body.addEventListener('drop', function(e) {
        e.preventDefault();
        var files = e.dataTransfer.files;
        if (files && files.length > 0) {
            var path = files[0].path || files[0].name;
            if (path.endsWith('.comp')) {
                handleOpenPath(path);
            }
        }
    });
}

// ========== HANDLERS ==========

async function handleOpenFile() {
    try {
        var result = await api.openFileDialog();
        if (result && result.path) {
            await handleOpenPath(result.path);
        }
    } catch (err) {
        _showAlert('Error selecting file: ' + err.message);
    }
}

async function handleCreateNew() {
    // Open a directory picker, then create a new blank company there
    var result;
    try {
        result = await api.browseDir();
    } catch (err) {
        _showAlert('Error selecting directory: ' + err.message);
        return;
    }
    var dir = result && result.path ? result.path : '';
    if (!dir) return;

    // Ask for company name (which becomes the base file name)
    var companyName = prompt('Enter company name:', '');
    if (companyName === null) return; // cancelled
    companyName = (companyName || '').trim();

    try {
        var blank = {
            name: companyName, address: '', website: '', company_type: '',
            emails: [], phones: [], contacts: [], notes: ''
        };
        var result = await api.save(dir, blank);
        appState.company = result.company;
        appState.directory = result.directory;
        appState.filename = result.filename;
        appState.filepath = result.filepath;
        appState.modified = false;
        render();
        _showAlert('✅ New company file created: ' + result.filename);
    } catch (err) {
        _showAlert('❌ Error creating company: ' + err.message);
    }
}

async function handleOpenPath(path) {
    try {
        var data = await api.open(path);
        appState.company = data.company;
        appState.directory = data.directory;
        appState.filename = data.filename;
        appState.filepath = data.filepath;
        appState.modified = false;
        render();
    } catch (err) {
        _showAlert('Error opening file: ' + err.message);
    }
}

function handleNewCompany() {
    if (appState.modified) {
        _showConfirmDialog('Discard unsaved changes?').then(function(confirmed) {
            if (confirmed) doNewCompany();
        });
    } else {
        doNewCompany();
    }
}

function doNewCompany() {
    appState.company = { name: '', address: '', website: '', company_type: '', emails: [], phones: [], contacts: [] };
    appState.directory = '';
    appState.filename = '';
    appState.filepath = '';
    appState.modified = false;
    render();
}

function handleCloseFile() {
    if (appState.modified) {
        _showConfirmDialog('Discard unsaved changes?').then(function(confirmed) {
            if (confirmed) {
                appState.company = null;
                appState.directory = '';
                appState.filename = '';
                appState.filepath = '';
                appState.modified = false;
                render();
            }
        });
    } else {
        appState.company = null;
        appState.directory = '';
        appState.filename = '';
        appState.filepath = '';
        appState.modified = false;
        render();
    }
}

async function handleSave() {
    gatherFormData();

    // If no directory yet (new company), prompt for one
    if (!appState.directory) {
        try {
            var browse = await api.browseDir();
            if (!browse || !browse.path) return;
            appState.directory = browse.path;
        } catch (err) {
            _showAlert('Error selecting directory: ' + err.message);
            return;
        }
    }

    try {
        var result = await api.save(appState.directory, appState.company);
        appState.company = result.company;
        appState.filename = result.filename;
        appState.filepath = result.filepath;
        appState.modified = false;
        render();
        _showAlert('✅ Company saved successfully!');
    } catch (err) {
        _showAlert('❌ Error saving: ' + err.message);
    }
}

function gatherFormData() {
    var c = appState.company;
    c.name = document.getElementById('comp-name-input').value.trim();
    c.company_type = document.getElementById('comp-type-select').value;
    c.address = document.getElementById('comp-address-input').value.trim();
    c.website = document.getElementById('comp-website-input').value.trim();
    var emailInputs = document.querySelectorAll('.comp-email-input');
    c.emails = Array.from(emailInputs).map(function(el) { return el.value.trim(); }).filter(Boolean);

    var phoneInputs = document.querySelectorAll('.comp-phone-input');
    c.phones = Array.from(phoneInputs).map(function(el) { return el.value.trim(); }).filter(Boolean);
}

function handleAddEmail() {
    var list = document.getElementById('comp-emails-list');
    var idx = list.querySelectorAll('.comp-email-input').length;
    var row = document.createElement('div');
    row.className = 'contact-field-row';
    row.innerHTML = '<input type="text" class="comp-email-input" data-idx="' + idx + '" placeholder="email@example.com" /><button class="btn btn-xs btn-danger" data-action="remove-email" data-idx="' + idx + '">✕</button>';
    list.appendChild(row);
    row.querySelector('input').focus();
    appState.modified = true;
}

function handleAddPhone() {
    var list = document.getElementById('comp-phones-list');
    var idx = list.querySelectorAll('.comp-phone-input').length;
    var row = document.createElement('div');
    row.className = 'contact-field-row';
    row.innerHTML = '<input type="text" class="comp-phone-input" data-idx="' + idx + '" placeholder="+123456789" /><button class="btn btn-xs btn-danger" data-action="remove-phone" data-idx="' + idx + '">✕</button>';
    list.appendChild(row);
    row.querySelector('input').focus();
    appState.modified = true;
}

// ========== UTILITY ==========

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _showConfirmDialog(msg) {
    return new Promise(function(resolve) {
        resolve(window.confirm(msg));
    });
}

function _showAlert(msg) {
    window.alert(msg);
}

document.addEventListener('DOMContentLoaded', init);
