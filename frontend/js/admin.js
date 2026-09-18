// admin.js
// Everything on this page still relies on backend admin authorization.
// Hiding this page in the UI is NOT the security control; the API checks the role too.

const societyForm = document.getElementById('societyForm');
const adminSocieties = document.getElementById('adminSocieties');
const applicantArea = document.getElementById('applicantArea');
const formTitle = document.getElementById('societyFormTitle');
const submitButton = document.getElementById('societySubmit');
const cancelEdit = document.getElementById('cancelEdit');
const logoutBtn = document.getElementById('logoutBtn');

let currentSocieties = [];

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function toInputDateTime(value) {
    const date = new Date(value);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resetForm() {
    societyForm.reset();
    document.getElementById('societyId').value = '';
    formTitle.textContent = 'Create society';
    submitButton.textContent = 'Create society';
    cancelEdit.classList.add('hidden');
}

function startEdit(id) {
    const society = currentSocieties.find(s => s.id === id);
    if (!society) return;

    document.getElementById('societyId').value = society.id;
    document.getElementById('sName').value = society.name;
    document.getElementById('sCategory').value = society.category;
    document.getElementById('sTagline').value = society.tagline || '';
    document.getElementById('sDeadline').value = toInputDateTime(society.deadline);
    document.getElementById('sDescription').value = society.description || '';
    document.getElementById('sCriteria').value = society.criteria || '';
    document.getElementById('sRoles').value = society.roles || '';

    formTitle.textContent = 'Edit society';
    submitButton.textContent = 'Save changes';
    cancelEdit.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
        window.location.href = 'login.html';
        throw new Error(data.message || 'Admin access required.');
    }

    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
}

async function loadSocieties() {
    try {
        const data = await request('/api/societies');
        currentSocieties = data.societies;

        adminSocieties.innerHTML = currentSocieties.length ? currentSocieties.map(s => `
            <div class="col-md-6">
                <div class="society-card">
                    <span class="category-badge">${escapeHtml(s.category)}</span>
                    <h3>${escapeHtml(s.name)}</h3>
                    <p>${escapeHtml(s.description)}</p>
                    <div class="card-meta"><strong>Deadline:</strong> ${escapeHtml(new Date(s.deadline).toLocaleString())}</div>
                    <div class="d-flex gap-2 flex-wrap mt-3">
                        <button class="btn btn-soft" onclick="startEdit(${s.id})">Edit</button>
                        <button class="btn btn-soft" onclick="viewApplicants(${s.id})">Applicants</button>
                        <button class="btn btn-warm" onclick="deleteSociety(${s.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('') : '<div class="empty-state">No societies yet. Create your first one above.</div>';
    } catch (error) {
        adminSocieties.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    }
}

societyForm.addEventListener('submit', async event => {
    event.preventDefault();

    const id = document.getElementById('societyId').value;
    const payload = {
        name: document.getElementById('sName').value.trim(),
        category: document.getElementById('sCategory').value,
        tagline: document.getElementById('sTagline').value.trim(),
        deadline: document.getElementById('sDeadline').value,
        description: document.getElementById('sDescription').value.trim(),
        criteria: document.getElementById('sCriteria').value.trim(),
        roles: document.getElementById('sRoles').value.trim()
    };

    submitButton.disabled = true;
    try {
        await request(id ? `/api/societies/${id}` : '/api/societies', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast(id ? 'Society updated.' : 'Society created.');
        resetForm();
        await loadSocieties();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitButton.disabled = false;
    }
});

cancelEdit.addEventListener('click', resetForm);

window.startEdit = startEdit;

window.deleteSociety = async function (id) {
    if (!confirm('Delete this society? Existing applications linked to it will also be removed.')) return;

    try {
        await request(`/api/societies/${id}`, { method: 'DELETE' });
        showToast('Society deleted.');
        await loadSocieties();
        applicantArea.textContent = 'Choose a society above to view applicants.';
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.viewApplicants = async function (id) {
    applicantArea.innerHTML = 'Loading applicants...';

    try {
        const data = await request(`/api/societies/${id}/applicants`);
        if (!data.applicants.length) {
            applicantArea.innerHTML = '<div class="empty-state">No applications for this society yet.</div>';
            return;
        }

        applicantArea.innerHTML = `
            <div class="table-wrap">
                <table class="table align-middle">
                    <thead><tr><th>Student</th><th>Branch/Year</th><th>Role</th><th>Applied</th><th>Status</th></tr></thead>
                    <tbody>
                        ${data.applicants.map(a => `
                            <tr>
                                <td><strong>${escapeHtml(a.name)}</strong><br><span class="muted">${escapeHtml(a.email)}</span></td>
                                <td>${escapeHtml(a.branch)} / Year ${escapeHtml(a.year)}</td>
                                <td>${escapeHtml(a.role)}</td>
                                <td>${escapeHtml(new Date(a.applied_at).toLocaleString())}</td>
                                <td>
                                    <select class="form-select form-select-sm" onchange="updateStatus(${a.id}, this.value)">
                                        ${['Pending','Accepted','Rejected'].map(status => `<option ${status === a.status ? 'selected' : ''}>${status}</option>`).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr><td colspan="5"><span class="muted"><strong>Why them:</strong> ${escapeHtml(a.why_you)}</span></td></tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        applicantArea.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    }
};

window.updateStatus = async function (applicationId, status) {
    try {
        await request(`/api/applications/${applicationId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast(`Status changed to ${status}.`);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
});

request('/api/auth/me').then(() => loadSocieties()).catch(() => {});
