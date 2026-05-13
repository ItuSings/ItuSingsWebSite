import './nav.js';
import './scroll.js';
import './text-morph.js';

/* ── Streaming modal ────────────────────────────────────────────────── */
const streamModal   = document.getElementById('stream-modal');
const streamClose   = document.getElementById('stream-modal-close');
const streamBackdrop = document.getElementById('stream-modal-backdrop');

function openStreamModal() {
  if (!streamModal) return;
  streamModal.hidden = false;
  document.body.style.overflow = 'hidden';
  streamClose.focus();
}

function closeStreamModal() {
  if (!streamModal) return;
  streamModal.hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-open-stream]').forEach(el => {
  el.addEventListener('click', openStreamModal);
});

if (streamClose)   streamClose.addEventListener('click', closeStreamModal);
if (streamBackdrop) streamBackdrop.addEventListener('click', closeStreamModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && streamModal && !streamModal.hidden) closeStreamModal();
});

/* ── Booking: reveal email on click, prevent repeat clicks ─────────── */
const bookingBtn  = document.getElementById('booking-btn');
const emailReveal = document.getElementById('booking-email-reveal');
const emailSlot   = document.getElementById('email-text');

/* Email rendered by JS so it is not in the raw HTML for bots to harvest */
if (emailSlot) {
  emailSlot.textContent = ['itusings', '@', 'gmail.com'].join('');
}

if (bookingBtn && emailReveal) {
  bookingBtn.addEventListener('click', () => {
    bookingBtn.style.display = 'none';
    emailReveal.classList.add('is-visible');
  }, { once: true });
}
