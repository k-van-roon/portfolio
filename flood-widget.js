// Replace with your actual Netlify function URL once deployed
const FLOOD_FN_URL = 'https://celebrated-creponne-e25e08.netlify.app/';

const floodBtn = document.getElementById('flood-btn');
const floodResult = document.getElementById('flood-result');
const floodBlurb = floodResult.querySelector('.flood-blurb');
const floodTag = floodResult.querySelector('.flood-tag');
const floodTimestamp = floodResult.querySelector('.flood-timestamp');
const floodError = document.getElementById('flood-error');

floodBtn.addEventListener('click', async () => {
  floodBtn.disabled = true;
  floodBtn.textContent = 'Running live simulation…';
  floodError.hidden = true;
  floodResult.hidden = true;

  try {
    const res = await fetch(FLOOD_FN_URL);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();

    floodBlurb.textContent = data.blurb;
    floodTag.textContent = `${data.risk} risk`;
    floodTag.dataset.risk = data.risk;
    floodTimestamp.textContent = new Date(data.generatedAt).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    floodResult.hidden = false;
  } catch (err) {
    floodError.textContent = `Couldn't fetch a live forecast right now (${err.message}). This calls the real FastFlood API, so occasional hiccups happen — try again in a moment.`;
    floodError.hidden = false;
  } finally {
    floodBtn.disabled = false;
    floodBtn.textContent = 'Check flood risk — Apeldoorn';
  }
});
