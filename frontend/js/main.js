// main.js
// Loads societies from MySQL through the Express API and renders the cards.

const societyContainer = document.getElementById('societyContainer');
const loadingMessage = document.getElementById('loadingMessage');
const societyCount = document.getElementById('societyCount');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');

const icons = {
    Technical: '⌘',
    Cultural: '♪',
    Sports: '✦',
    Literary: '✎',
    Entrepreneurship: '↗',
    Creative: '✧'
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
}

function formatDeadline(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Deadline not available';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function renderSocieties(societies) {
    societyCount.textContent = societies.length;

    if (!societies.length) {
        societyContainer.innerHTML = '<div class="col-12"><div class="empty-state">No societies match your search.</div></div>';
        return;
    }

    societyContainer.innerHTML = societies.map(society => `
        <div class="col-md-6 col-xl-4">
            <article class="society-card">
                <div class="card-top">
                    <div class="society-icon">${icons[society.category] || '•'}</div>
                    <span class="category-badge">${escapeHtml(society.category)}</span>
                </div>
                <h3>${escapeHtml(society.name)}</h3>
                <div class="card-tagline">${escapeHtml(society.tagline || 'Find your place here.')}</div>
                <p>${escapeHtml(society.description)}</p>
                <div class="card-meta mb-3"><strong>Apply by:</strong> ${escapeHtml(formatDeadline(society.deadline))}</div>
                <a class="btn btn-warm w-100" href="society.html?id=${encodeURIComponent(society.id)}">View society</a>
            </article>
        </div>
    `).join('');
}

async function loadSocieties() {
    loadingMessage.textContent = 'Loading societies...';
    loadingMessage.classList.remove('hidden');

    try {
        const params = new URLSearchParams();
        if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
        if (categorySelect.value !== 'All') params.set('category', categorySelect.value);

        const response = await fetch(`/api/societies?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Unable to load societies.');

        renderSocieties(data.societies);
        loadingMessage.classList.add('hidden');
    } catch (error) {
        console.error(error);
        societyContainer.innerHTML = '<div class="col-12"><div class="empty-state">Unable to load societies. Make sure the backend and MySQL are running.</div></div>';
        loadingMessage.classList.add('hidden');
    }
}

let searchTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadSocieties, 250);
});
categorySelect.addEventListener('change', loadSocieties);
loadSocieties();
