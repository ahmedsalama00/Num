// This script attempts to prevent casual users from viewing the source code in the browser.
// It blocks right-clicking (context menu) and common developer tool keyboard shortcuts.
// Note: It is impossible to 100% prevent users from seeing HTML on the web, but this stops casual inspection.

document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

document.addEventListener('keydown', function(e) {
  // Prevent F12
  if (e.key === 'F12') {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+I (DevTools)
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+J (DevTools Console)
  if (e.ctrlKey && e.shiftKey && e.key === 'J') {
    e.preventDefault();
  }
  // Prevent Ctrl+Shift+C (DevTools Element Inspector)
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
  }
  // Prevent Ctrl+U / Cmd+Option+U (View Source)
  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
  }
});
