// Keep one Writer instance alive when switching between the demo and screenshot.
// The app owns its loading UI, files, and document state in its own origin.
(() => {
  const showcase = document.getElementById('writer-demo');
  const toolbar = showcase.querySelector('.embed-toolbar');
  const screenshot = showcase.querySelector('.writer-preview');
  const caption = showcase.querySelector('.preview-caption > span');
  const screenshotCaption = caption.textContent;
  const workspace = document.getElementById('embed-workspace');
  const start = document.getElementById('embed-start');
  const preview = document.getElementById('embed-preview');
  const expand = document.getElementById('embed-expand');
  const note = document.getElementById('embed-note');
  let frame;

  function showEditor() {
    caption.textContent = 'Live Writer. Edit a document, then save a copy.';
    screenshot.hidden = true;
    workspace.hidden = false;
    start.hidden = true;
    preview.hidden = false;
    expand.hidden = !document.fullscreenEnabled;
    note.textContent = 'Save in Writer downloads a copy. Your document stays open while you’re on this page. On small screens, scroll sideways to explore the editor.';
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = 'Starling Writer document editor';
      frame.src = 'https://writer.starling.build/';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      workspace.append(frame);
    }
    showcase.scrollIntoView({ behavior: 'instant', block: 'start' });
    // Keep a visible exit from the editor reachable before entering the canvas.
    preview.focus({ preventScroll: true });
  }

  start.addEventListener('click', showEditor);
  document.querySelectorAll('[data-try-writer]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showEditor();
    });
  });

  preview.addEventListener('click', async () => {
    if (document.fullscreenElement === showcase) await document.exitFullscreen();
    workspace.hidden = true;
    screenshot.hidden = false;
    caption.textContent = screenshotCaption;
    preview.hidden = true;
    expand.hidden = true;
    start.hidden = false;
    start.textContent = 'Resume editing';
    note.textContent = 'Your document is still open. Resume editing to pick up where you left off.';
    start.focus({ preventScroll: true });
  });

  expand.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === showcase) await document.exitFullscreen();
      else await showcase.requestFullscreen();
    } catch {
      note.textContent = 'Full screen is unavailable here. You can keep editing below.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    expand.textContent = document.fullscreenElement === showcase ? 'Exit full screen' : 'Expand editor';
  });

  toolbar.hidden = false;
  note.hidden = false;
})();
