/* motion study for jayroddi.dev. sound stays off until the pill is pressed. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pages = [
    { id: "grind", n: "01", name: "grind", line: "we fall to the level of our habits", star: true, face: "grind" },
    { id: "snaps", n: "02", name: "snaps", line: "sharp through october. glass after.", star: true, face: "frost" },
    { id: "music", n: "03", name: "music", line: "shuffle around and find out", face: "music" },
    { id: "books", n: "04", name: "books", line: "garbage in, garbage out", face: "books" },
    { id: "quotes", n: "05", name: "quotes", line: "influence over influencers", face: "quotes" }
  ];

  function roll(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 13) % 2147483647;
      return s % 10;
    };
  }
  function level(n) {
    if (n > 7) return "lv4";
    if (n > 5) return "lv3";
    if (n > 3) return "lv2";
    if (n > 1) return "lv1";
    return "";
  }
  function paint(host, count, seed, cols) {
    const next = roll(seed);
    host.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement("i");
      const lv = level(next());
      if (lv) cell.className = lv;
      host.append(cell);
    }
  }

  function fillField(field, seed, cell) {
    const rect = field.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const gap = 6;
    const cols = Math.max(8, Math.floor((rect.width + gap) / (cell + gap)));
    const rows = Math.max(6, Math.floor((rect.height + gap) / (cell + gap)));
    field.replaceChildren();
    field.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    field.style.gridAutoRows = `${cell}px`;
    field.style.justifyContent = "center";
    field.style.alignContent = "center";
    const next = roll(seed);
    for (let i = 0; i < cols * rows; i++) {
      const bit = document.createElement("i");
      const lv = level(next());
      if (lv) bit.className = lv;
      field.append(bit);
    }
  }
  function fields() {
    document.querySelectorAll(".field").forEach((field, index) => {
      const near = field.classList.contains("near");
      const cell = innerWidth < 700 ? (near ? 22 : 34) : (near ? 52 : 78);
      fillField(field, 40 + index * 90, cell);
    });
  }
  fields();
  addEventListener("resize", fields);
  document.querySelectorAll("[data-art='grind']").forEach((host) => {
    host.classList.add("art-grind");
    paint(host, 18 * 7, 11, 18);
  });

  const caseEl = document.querySelector(".case");
  const holder = document.querySelector(".squares");
  const squares = [];
  if (holder) {
    pages.forEach((page, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "square";
      button.dataset.id = page.id;
      button.setAttribute("aria-label", page.name);
      button.innerHTML = `<span class="face"><span class="mini ${page.face}"></span></span><span class="sq-label">${page.star ? '<span class="star">★</span>' : ""}${page.name}</span>`;
      holder.append(button);
      const mini = button.querySelector(".mini");
      paint(mini, 24, 20 + index * 17, 6);
      squares.push(button);
    });
  }

  const readN = document.querySelector("[data-n]");
  const readName = document.querySelector("[data-name]");
  const readLine = document.querySelector("[data-line]");
  const well = document.getElementById("well");
  const empty = well ? well.querySelector(".well-empty") : null;
  let pin = null;
  let hover = null;
  let mode = "rest";
  let held = false;

  function pageById(id) {
    return pages.find((page) => page.id === id) || null;
  }
  function paintReadout() {
    const page = pageById(hover || pin);
    if (!page) {
      if (readN) readN.textContent = "05";
      if (readName) readName.textContent = "squares";
      if (readLine) readLine.textContent = "hover a square to lift it.";
      return;
    }
    if (readN) readN.textContent = page.n;
    if (readName) readName.textContent = page.name;
    if (readLine) readLine.textContent = page.line;
  }
  function openWell(id) {
    if (!well) return;
    well.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== id;
    });
    if (empty) empty.hidden = Boolean(id);
    document.querySelectorAll(".study").forEach((study) => {
      study.classList.toggle("on", study.id === id);
    });
    const panel = id ? well.querySelector(`[data-panel="${id}"]`) : null;
    if (panel && window.gsap && !reduce) {
      gsap.fromTo(panel, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
    }
  }

  function layout(animate) {
    if (!caseEl || !squares.length) return;
    const w = caseEl.clientWidth;
    const sq = w < 520 ? 62 : 88;
    caseEl.style.setProperty("--sq", sq + "px");
    const n = squares.length;
    const step = n > 1 ? (w - 28 - sq) / (n - 1) : 0;
    const fanned = mode === "fan" || Boolean(pin);
    squares.forEach((square, i) => {
      const id = square.dataset.id;
      const restX = (w - sq) / 2 + (i - (n - 1) / 2) * (w < 520 ? 28 : 46);
      let x = restX;
      let y = 8;
      let rot = -8 + i * 4;
      let scale = 1;
      if (fanned) {
        x = 14 + i * step;
        y = w < 520 ? -118 : -132;
        rot = -11 + i * 5;
      }
      if (hover === id && pin !== id) {
        y -= 22;
        scale = 1.05;
        rot = -2;
      }
      if (pin === id) {
        y -= 36;
        scale = 1.08;
        rot = -1;
      }
      square.style.zIndex = pin === id ? "30" : String(i + 1);
      const vars = {
        x, y, rotation: rot, scale,
        duration: animate && !reduce ? 0.65 : 0,
        ease: fanned ? "power3.out" : "power2.inOut",
        overwrite: "auto"
      };
      if (window.gsap) gsap.to(square, vars);
      else square.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
      square.classList.add("ready");
    });
    paintReadout();
  }

  function pinTo(id) {
    pin = id;
    mode = "fan";
    held = false;
    openWell(id);
    layout(true);
    tick();
  }

  if (caseEl) {
    caseEl.addEventListener("pointerenter", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      if (held || pin) return;
      mode = "fan";
      layout(true);
    });
    caseEl.addEventListener("pointerleave", () => {
      held = false;
      hover = null;
      if (!pin) mode = "rest";
      layout(true);
    });
    caseEl.addEventListener("click", (event) => {
      if (event.target.closest(".square")) return;
      pin = null;
      hover = null;
      mode = "rest";
      held = true;
      openWell(null);
      layout(true);
    });
  }
  squares.forEach((square) => {
    square.addEventListener("pointerenter", () => {
      hover = square.dataset.id;
      layout(true);
    });
    square.addEventListener("pointerleave", () => {
      if (hover === square.dataset.id) hover = null;
      layout(true);
    });
    square.addEventListener("focus", () => {
      hover = square.dataset.id;
      if (!pin) mode = "fan";
      layout(true);
    });
    square.addEventListener("click", (event) => {
      event.stopPropagation();
      pinTo(square.dataset.id);
    });
  });
  document.getElementById("put-back")?.addEventListener("click", () => {
    pin = null;
    hover = null;
    mode = "rest";
    held = true;
    openWell(null);
    layout(true);
  });
  document.querySelectorAll("[data-open]").forEach((node) => {
    node.addEventListener("click", () => {
      pinTo(node.dataset.open);
      document.getElementById("squares")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pin) {
      pin = null;
      hover = null;
      mode = "rest";
      openWell(null);
      layout(true);
    }
  });
  layout(false);
  addEventListener("resize", () => layout(false));

  const links = [...document.querySelectorAll(".pill a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  function mark(id) {
    links.forEach((link) => link.classList.toggle("on", link.getAttribute("href") === "#" + id));
    const current = links.find((link) => link.classList.contains("on"));
    const pill = current && current.parentElement;
    if (pill && pill.scrollWidth > pill.clientWidth) {
      pill.scrollLeft = current.offsetLeft - pill.clientWidth / 2 + current.offsetWidth / 2;
    }
  }
  function spy() {
    const line = innerHeight * 0.62;
    let id = sections[0] ? sections[0].id : "top";
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= line) id = section.id;
    });
    mark(id);
  }
  addEventListener("scroll", spy, { passive: true });
  spy();

  const pixels = document.querySelector(".pixels");
  const cells = [];
  if (pixels) {
    const cols = 16;
    const rows = 6;
    const sky = [2, 3, 4, 3, 5, 3, 2, 4, 5, 4, 3, 6, 4, 2, 3, 4];
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = document.createElement("i");
        const fromBottom = rows - 1 - row;
        const height = sky[col];
        const inside = fromBottom < height;
        const dither = bayer[row % 4][col % 4] / 16;
        const threshold = inside ? (1 - fromBottom / height) * 0.55 + dither * 0.2 : 2;
        cell.dataset.t = String(threshold);
        if (inside) cells.push(cell);
        pixels.append(cell);
      }
    }
    const apply = (progress) => {
      cells.forEach((cell) => cell.classList.toggle("on", Number(cell.dataset.t) <= progress));
    };
    if (reduce || !window.gsap) apply(1);
    else {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.create({
        trigger: ".wipe",
        start: "top 88%",
        end: "bottom 55%",
        scrub: true,
        onUpdate: (self) => apply(self.progress)
      });
    }
  }

  const words = document.querySelectorAll(".manifesto span");
  if (window.gsap && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to(".field.far", {
      y: 50, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    gsap.to(".field.near", {
      y: 110, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    gsap.to(".blackout", {
      opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    gsap.to(".hero-copy", {
      y: -24, opacity: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    gsap.to(".scroll-hold", {
      opacity: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom bottom", scrub: true }
    });
    if (words.length) {
      gsap.to(words, {
        color: "#f4efe6",
        stagger: 0.08,
        ease: "none",
        scrollTrigger: { trigger: ".manifesto", start: "top 78%", end: "bottom 42%", scrub: true }
      });
    }
  }

  let audio = null;
  let soundOn = false;
  function tick() {
    if (!soundOn || !audio) return;
    const time = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = 540;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.02, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(time);
    osc.stop(time + 0.08);
  }
  const sound = document.querySelector(".sound");
  if (sound) {
    sound.addEventListener("click", () => {
      soundOn = !soundOn;
      sound.setAttribute("aria-pressed", String(soundOn));
      sound.textContent = soundOn ? "sound on" : "sound off";
      if (soundOn) {
        if (!audio) audio = new AudioContext();
        if (audio.state === "suspended") audio.resume();
        tick();
      }
    });
  }
  document.querySelectorAll(".keycap").forEach((key) => {
    key.addEventListener("pointerdown", () => tick());
  });
})();
