/* The jayos installer, played when the homepage loads. */
(() => {
  const os = document.querySelector('.os');
  if (!os || os.dataset.played === '1') return;
  os.dataset.played = '1';
  const log = os.querySelector('.os-log');
  const steps = ['reading diablo', 'unmounting jayos2.0', 'writing skyline', 'verifying boot', 'install complete'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    os.classList.add('is-done');
    if (log) log.textContent = 'install complete';
    return;
  }
  os.classList.add('is-run');
  let step = 0;
  if (log) log.textContent = steps[0];
  const timer = setInterval(() => {
    step += 1;
    if (step >= steps.length - 1) {
      clearInterval(timer);
      if (log) log.textContent = steps[steps.length - 1];
      os.classList.add('is-done');
      return;
    }
    if (log) log.textContent = steps[step];
  }, 800);
})();
