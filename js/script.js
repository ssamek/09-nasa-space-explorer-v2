// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Small collection of fun space facts. Add or edit facts as you like.
const spaceFacts = [
	"Venus spins backwards — the Sun rises in the west there.",
	"A day on Venus is longer than a year on Venus (it rotates very slowly).",
	"There are more stars in the observable universe than grains of sand on all Earth’s beaches.",
	"A teaspoon of neutron star would weigh about 6 billion tons on Earth.",
	"The footprints on the Moon will likely remain for millions of years because the Moon has no atmosphere.",
	"Jupiter's Great Red Spot is a storm larger than Earth and has existed for centuries.",
	"Space is not completely empty — it contains sparse gas, dust, and cosmic rays.",
	"There is floating water in space — a massive cloud containing 140 trillion times the water of Earth's oceans was found around a quasar.",
	"Neutrinos from the Sun pass through your body by the trillions every second, but you don't feel them.",
	"The coldest place in the solar system is Pluto's shadowed regions, plunging below -400°F (-240°C)."
];

function showRandomFact() {
	const el = document.getElementById('didYouKnowText');
	if (!el) return;
	const idx = Math.floor(Math.random() * spaceFacts.length);
	el.textContent = spaceFacts[idx];
}

// Fetch APOD data from the CDN and return the parsed JSON array.
// This function does not mutate the DOM so it can be reused in tests.
async function fetchApodData() {
	try {
		const response = await fetch(apodData);
		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.status}`);
		}
		const data = await response.json();
		console.log('APOD data fetched:', data);
		return data;
	} catch (error) {
		console.error('Failed to fetch APOD data:', error);
		// Re-throw so caller can handle UI concerns
		throw error;
	}
}

// --- Modal & video helpers (global) ---------------------------------
// Helper to extract YouTube ID from several URL formats
function extractYouTubeId(url) {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (u.hostname === 'youtu.be') {
			return u.pathname.slice(1);
		}
		if (u.hostname.includes('youtube.com')) {
			return u.searchParams.get('v') || null;
		}
	} catch (e) {
		// not a valid URL
	}
	return null;
}

function getYouTubeThumbnail(url) {
	const id = extractYouTubeId(url);
	if (!id) return null;
	return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function closeModal() {
	const modal = document.getElementById('lightboxModal');
	if (!modal) return;
	modal.classList.remove('is-open');
	modal.setAttribute('aria-hidden', 'true');
	document.body.style.overflow = '';
	// clear media to help with memory
	const mMedia = document.getElementById('modalMedia');
	if (mMedia) mMedia.innerHTML = '';
}

function openModal(item) {
	const modal = document.getElementById('lightboxModal');
	if (!modal) return;
	const mMedia = document.getElementById('modalMedia');
	const mTitle = document.getElementById('modalTitle');
	const mDate = document.getElementById('modalDate');
	const mExp = document.getElementById('modalExplanation');

	// Clear previous media
	if (mMedia) mMedia.innerHTML = '';

	if (item.media_type === 'image') {
		const img = document.createElement('img');
		img.src = item.hdurl || item.url || '';
		img.alt = item.title || 'Space image';
		if (mMedia) mMedia.appendChild(img);
	} else if (item.media_type === 'video') {
		// For YouTube links, embed; otherwise show thumbnail + link
		const ytId = extractYouTubeId(item.url);
		if (ytId) {
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube.com/embed/${ytId}`;
			iframe.setAttribute('allowfullscreen', '');
			iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
			if (mMedia) mMedia.appendChild(iframe);
		} else if (item.thumbnail_url) {
			const img = document.createElement('img');
			img.src = item.thumbnail_url;
			img.alt = item.title || 'Video thumbnail';
			if (mMedia) mMedia.appendChild(img);
			const link = document.createElement('p');
			link.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in new tab</a>`;
			if (mMedia) mMedia.appendChild(link);
		} else {
			// Last resort: provide link only
			const link = document.createElement('p');
			link.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in new tab</a>`;
			if (mMedia) mMedia.appendChild(link);
		}
	}

	if (mTitle) mTitle.textContent = item.title || '';
	if (mDate) mDate.textContent = item.date ? new Date(item.date).toLocaleDateString() : '';
	if (mExp) mExp.textContent = item.explanation || '';

	modal.classList.add('is-open');
	modal.setAttribute('aria-hidden', 'false');
	document.body.style.overflow = 'hidden';
	// focus the close button for accessibility
	const modalClose = document.getElementById('modalClose');
	if (modalClose) modalClose.focus();
}

// ---------------------------------------------------------------------

// Render a gallery of images into the existing #gallery element.
// Each gallery item shows the image, title, and date.
function renderGallery(items) {
	if (!Array.isArray(items)) {
		console.warn('APOD data is not an array:', items);
		return;
	}

	const gallery = document.getElementById('gallery');
	if (!gallery) {
		console.warn('No #gallery element found in the page.');
		return;
	}

	// Clear existing content
	gallery.innerHTML = '';

	// Keep image and video items only (preserve order)
	const entries = items.filter((it) => (it.media_type === 'image' && it.url) || (it.media_type === 'video' && (it.url || it.thumbnail_url)));

	if (entries.length === 0) {
		gallery.innerHTML = '<div class="placeholder"><p>No media items available.</p></div>';
		return;
	}

	entries.forEach((item) => {
		const card = document.createElement('div');
		card.className = 'gallery-item';
		card.tabIndex = 0; // make focusable for keyboard users
		// Title
		const title = document.createElement('h3');
		title.textContent = item.title || 'Untitled';

		// Date
		const date = document.createElement('p');
		date.textContent = item.date ? new Date(item.date).toLocaleDateString() : 'Unknown date';

		if (item.media_type === 'image') {
			// Image element
			const img = document.createElement('img');
			img.src = item.url;
			img.alt = item.title || 'Space image';

			// Append thumbnail, title and date (hide full explanation here - shown in modal)
			card.appendChild(img);
			card.appendChild(title);
			card.appendChild(date);
		} else if (item.media_type === 'video') {
			// Try to find a thumbnail: prefer explicit thumbnail_url, else try YouTube thumb
			const thumb = item.thumbnail_url || getYouTubeThumbnail(item.url) || '';
			if (thumb) {
				const img = document.createElement('img');
				img.src = thumb;
				img.alt = item.title || 'Video thumbnail';
				card.appendChild(img);
				// small play badge
				const badge = document.createElement('div');
				badge.className = 'video-badge';
				badge.textContent = '▶';
				card.appendChild(badge);
			} else {
				// If no thumbnail, provide a simple link element inside the card
				const link = document.createElement('a');
				link.href = item.url;
				link.textContent = 'Watch video';
				link.target = '_blank';
				link.rel = 'noopener noreferrer';
				card.appendChild(link);
			}

			// Append title and date only; full explanation will show in modal
			card.appendChild(title);
			card.appendChild(date);
		}

		// Open modal when the card is clicked or activated via keyboard
		card.addEventListener('click', () => openModal(item));
		card.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openModal(item);
			}
		});

		gallery.appendChild(card);
	});
}

// Show a simple error message inside the gallery
function showError(error) {
	const gallery = document.getElementById('gallery');
	if (!gallery) return;
	gallery.innerHTML = `<div class="placeholder"><p style="color: red;">Error loading data: ${error.message}</p></div>`;
}

// Attach click handler to the button so gallery is populated on demand
document.addEventListener('DOMContentLoaded', () => {
	// show a random space fact on each load
	showRandomFact();
	const btn = document.getElementById('getImageBtn');
	if (!btn) return;

	btn.addEventListener('click', async () => {
		// Provide simple loading feedback
		btn.disabled = true;
		const prevText = btn.textContent;
		btn.textContent = 'Loading...';

		// Show a short loading message in the gallery area so users know images are on the way
		const gallery = document.getElementById('gallery');
		if (gallery) {
			gallery.innerHTML = '<div class="placeholder"><div class="placeholder-icon">🔄</div><p>Loading space photos…</p></div>';
		}

		try {
			const data = await fetchApodData();
			renderGallery(data || []);
		} catch (err) {
			showError(err);
		} finally {
			btn.disabled = false;
			btn.textContent = prevText;
		}
	});
    
	// Modal wiring: close button, overlay, Escape key
	const modalOverlay = document.getElementById('modalOverlay');
	const modalClose = document.getElementById('modalClose');

	if (modalClose) modalClose.addEventListener('click', closeModal);
	if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeModal();
		}
	});
});