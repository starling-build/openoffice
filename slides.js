const descriptions = [
  'Big ideas. Start here. An open source office suite, starting with Writer.',
  'Write something great. Writer offers a familiar ribbon, styles, tables and pictures. DOCX, RTF, Markdown and text.',
  'Your office. Everywhere. Writer is live on the web. macOS, Windows, Linux, iOS and Android are planned.',
  'Open code. Shared ambition. Built on Starling, licensed under Apache 2.0. Only Writer is available so far.',
];
const canvas = document.getElementById('starling');
const stage = document.getElementById('stage');
const poster = document.getElementById('poster');
const status = document.getElementById('load-status');
const prev = document.getElementById('previous'), next = document.getElementById('next');
const dots = [...document.querySelectorAll('[data-slide]')];
let app, index = Math.max(0, Math.min(3, (Number(location.hash.slice(1)) || 1) - 1));
let portrait;
const isPortrait = () => canvas.clientWidth < canvas.clientHeight;
function update() {
  poster.querySelector('source').srcset = `slides/tall-${index + 1}.png`;
  // Use the canvas's aspect ratio, which excludes the HTML controls.
  poster.querySelector('source').media = isPortrait() ? 'all' : 'not all';
  poster.querySelector('img').src = `slides/wide-${index + 1}.png`;
  poster.querySelector('img').alt = descriptions[index];
  document.getElementById('slide-description').textContent = descriptions[index];
  canvas.setAttribute('aria-label', `Slide ${index + 1} of 4: ${descriptions[index]}`);
  document.getElementById('position').textContent = `0${index + 1} / 04`;
  prev.disabled = index === 0; next.disabled = index === 3;
  dots.forEach((dot, i) => i === index ? dot.setAttribute('aria-current', 'step') : dot.removeAttribute('aria-current'));
  const action = document.getElementById('slide-action');
  action.href = index === 3 ? 'https://github.com/starling-build/starling/tree/office/apps/OfficeApp' : 'https://writer.starling.build/';
  action.innerHTML = `${index === 3 ? 'Explore the code' : index === 1 ? 'Try Writer' : 'Start writing'} <span aria-hidden="true">↗</span>`;
  stage.style.background = ['#2449df', '#f7f9ff', '#edf2ff', '#101d37'][index];
  document.getElementById('download-deck').href = `slides/landing-${isPortrait() ? 'tall' : 'wide'}.pptx`;
  history.replaceState(null, '', `#${index + 1}`);
}
function go(to) {
  index = Math.max(0, Math.min(3, to));
  app?.swift.office_landing_go(index);
  update();
}
prev.addEventListener('click', () => go(index - 1));
next.addEventListener('click', () => go(index + 1));
dots.forEach(dot => dot.addEventListener('click', () => go(Number(dot.dataset.slide))));
window.addEventListener('hashchange', () => go((Number(location.hash.slice(1)) || 1) - 1));
const story = document.getElementById('story');
document.getElementById('read-text').addEventListener('click', () => story.showModal());
document.getElementById('close-story').addEventListener('click', () => story.close());
window.addEventListener('keydown', event => {
  if (story.open || event.altKey || event.ctrlKey || event.metaKey || (app && event.target === canvas)) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) { event.preventDefault(); go(index + 1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1); }
  if (event.key === 'Home') { event.preventDefault(); go(0); }
  if (event.key === 'End') { event.preventDefault(); go(3); }
});
// Navigation works on the rendered slide previews while the live app starts.
let touchStart;
stage.addEventListener('pointerdown', event => { if (!app) touchStart = { x: event.clientX, y: event.clientY }; });
stage.addEventListener('pointerup', event => {
  if (app || !touchStart) return;
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
});
stage.addEventListener('pointercancel', () => { touchStart = null; });
new ResizeObserver(() => {
  const nextPortrait = isPortrait();
  if (portrait !== nextPortrait) {
    portrait = nextPortrait;
    app?.swift.office_landing_portrait(portrait ? 1 : 0);
    update();
  }
}).observe(canvas);
update();
document.getElementById('retry').addEventListener('click', () => location.reload());
try {
  const response = await fetch('runtime.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Presentation runtime: ${response.status}`);
  const config = await response.json();
  const { startStarling } = await import(`./${config.base}starling.js`);
  app = await startStarling({
    canvas, captureTab: false, app: `${config.base}app.wasm.gz`, skwasmBase: `${config.base}skwasm/`,
    fonts: `${config.base}fonts/manifest.json`,
    initialRoute: `/office-landing${isPortrait() ? '/portrait' : ''}`,
    initialFiles: [
      { name: 'landing-wide.pptx', url: 'slides/landing-wide.pptx' },
      { name: 'landing-tall.pptx', url: 'slides/landing-tall.pptx' },
    ],
    onPhase: () => { status.textContent = 'Starting live slides…'; },
    onFontStatus: ({ pending, failed }) => {
      if (app) status.textContent = failed.length ? 'A font could not load. Refresh to retry.' : pending.length ? 'Loading presentation fonts…' : '';
    },
  });
  window.starling = app;
  // Wait for the Swift widget tree before sending embed controls.
  const deadline = performance.now() + 15000;
  while (!app.debug('landing')) {
    if (performance.now() > deadline) throw new Error('Presentation did not become ready');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  app.swift.office_landing_portrait(isPortrait() ? 1 : 0);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  app.swift.office_landing_go(index);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  stage.classList.add('live');
  status.textContent = '';
  document.title = 'Starling Office — an open source office suite';
  setInterval(() => {
    const state = JSON.parse(app.debug('landing'));
    if (state && state.index !== index) { index = state.index; update(); }
  }, 100);
} catch (error) {
  console.error(error);
  status.textContent = 'Slide previews are available. Live playback could not start.';
  document.getElementById('retry').hidden = false;
}
