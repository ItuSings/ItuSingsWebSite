import './nav.js';
import './scroll.js';
import './text-morph.js';

/* ── Hero video: skip to 1 min, guard against short/unloadable video ── */
const heroVideo = document.querySelector('.hero__video video');
if (heroVideo) {
  heroVideo.addEventListener('loadedmetadata', () => {
    if (heroVideo.duration > 60) {
      heroVideo.currentTime = 60;
    }
  });
}

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
