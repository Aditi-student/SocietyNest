// society.js
// Loads one society and lets a logged-in student submit an application.

const id = new URLSearchParams(window.location.search).get('id');
const details = document.getElementById('societyDetails');
const applicationSection = document.getElementById('applicationSection');
const logoutBtn = document.getElementById('logoutBtn');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
}

async function loadSociety() {
    if (!id) {
        details.innerHTML = '<h2>Society not found</h2>';
        return;
    }

    try {
        const response = await fetch(`/api/societies/${encodeURIComponent(id)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load society.');
        const society = data.society;
        const deadline = new Date(society.deadline);

        details.innerHTML = `
            <span class="category-badge">${escapeHtml(society.category)}</span>
            <h1 class="mt-3">${escapeHtml(society.name)}</h1>
            <p class="card-tagline">${escapeHtml(society.tagline || '')}</p>
            <p>${escapeHtml(society.description)}</p>
            <div class="row g-3 mt-3">
                <div class="col-md-6"><div class="detail-block"><h3>Who can apply</h3><p>${escapeHtml(society.criteria || 'Open to interested students.')}</p></div></div>
                <div class="col-md-6"><div class="detail-block"><h3>Roles</h3><p>${escapeHtml(society.roles || 'Discuss available roles during recruitment.')}</p></div></div>
            </div>
            <div class="card-meta"><strong>Application deadline:</strong> ${escapeHtml(deadline.toLocaleString([], {dateStyle:'medium', timeStyle:'short'}))}</div>
        `;

        applicationSection.innerHTML = `
            <h3 class="mb-2">Ready to apply?</h3>
            <p class="muted">Your application is checked again on the server to make sure the deadline has not passed.</p>
            <div id="applyMessage"></div>
            <form id="applicationForm" class="row g-3 mt-1">
                <div class="col-md-5"><label class="form-label">Preferred role</label><input id="role" class="form-control" required maxlength="100" placeholder="e.g. Web Development"></div>
                <div class="col-12"><label class="form-label">Why are you a good fit?</label><textarea id="whyYou" class="form-control" rows="4" required maxlength="3000" placeholder="Tell the society team what interests you and what you can contribute."></textarea></div>
                <div class="col-12"><button class="btn btn-warm" id="applyButton" type="submit">Submit application</button></div>
            </form>
        `;

        document.getElementById('applicationForm').addEventListener('submit', submitApplication);
    } catch (error) {
        details.innerHTML = `<h2>Unable to load society</h2><p class="muted">${escapeHtml(error.message)}</p>`;
    }
}

async function submitApplication(event) {
    event.preventDefault();
    const button = document.getElementById('applyButton');
    const message = document.getElementById('applyMessage');

    button.disabled = true;
    button.textContent = 'Submitting...';

    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                societyId: Number(id),
                role: document.getElementById('role').value.trim(),
                whyYou: document.getElementById('whyYou').value.trim()
            })
        });

        const data = await response.json();
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) throw new Error(data.message || 'Unable to submit application.');

        message.innerHTML = '<div class="alert alert-success">Application submitted successfully. <a href="applications.html">View my applications →</a></div>';
        document.getElementById('applicationForm').reset();
    } catch (error) {
        message.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Submit application';
    }
}

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'index.html';
});

loadSociety();
