// applications.js
// Loads applications belonging only to the currently logged-in student.

const container = document.getElementById('applicationsContainer');
const logoutBtn = document.getElementById('logoutBtn');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
}

function statusClass(status) {
    return status === 'Accepted' ? 'status-accepted' : status === 'Rejected' ? 'status-rejected' : 'status-pending';
}

async function loadApplications() {
    try {
        const response = await fetch('/api/applications/my', { credentials: 'include' });
        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) throw new Error(data.message || 'Unable to load applications.');

        if (!data.applications.length) {
            container.innerHTML = '<div class="empty-state panel">You have not applied to any society yet. <a href="index.html" style="color:var(--terra-dark);font-weight:700;">Explore societies →</a></div>';
            return;
        }

        container.innerHTML = data.applications.map(app => `
            <div class="panel">
                <div class="d-flex justify-content-between gap-3 flex-wrap">
                    <div>
                        <span class="category-badge">${escapeHtml(app.category)}</span>
                        <h3 class="mt-2 mb-1">${escapeHtml(app.society_name)}</h3>
                        <div class="muted">Role: ${escapeHtml(app.role)}</div>
                    </div>
                    <div><span class="status-badge ${statusClass(app.status)}">${escapeHtml(app.status)}</span></div>
                </div>
                <div class="card-meta mt-3"><strong>Applied:</strong> ${escapeHtml(new Date(app.applied_at).toLocaleString())}</div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    }
}

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
});

loadApplications();
