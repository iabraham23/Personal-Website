const scene = document.querySelector(".scene");
const sceneCamera = document.querySelector(".scene-camera");
const sceneComposition = document.querySelector(".scene-composition");
const categoryLinks = Array.from(document.querySelectorAll(".category-link"));

const DESKTOP_QUERY = window.matchMedia("(min-width: 960px)");
const INTRO_SCALE_START = 2.25;
const HUB_SCALE = 0.62;
const CENTER_TARGET = "center";
const VALID_TARGETS = new Set([
  CENTER_TARGET,
  "about",
  "projects",
  "work",
  "extracurriculars",
]);

const CAMERA_TARGETS = {
  center: { x: "0vw", y: "0vh", scale: HUB_SCALE },
};

const FOCUS_LAYOUTS = {
  about: { selector: ".about", viewportX: 0.77, viewportY: 0.76, scale: 1.18 },
  projects: { selector: ".projects", viewportX: 0.23, viewportY: 0.76, scale: 1.18 },
  work: { selector: ".work", viewportX: 0.77, viewportY: 0.24, scale: 1.22 },
  extracurriculars: { selector: ".extracurriculars", viewportX: 0.23, viewportY: 0.24, scale: 1.18 },
};

const state = {
  mode: "intro",
  target: CENTER_TARGET,
  introProgress: 0,
  lockedCenterTransition: false,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getViewportTarget(target) {
  if (target === CENTER_TARGET) {
    return CAMERA_TARGETS.center;
  }

  const config = FOCUS_LAYOUTS[target];
  const focusElement = config ? document.querySelector(config.selector) : null;

  if (!config || !focusElement || !sceneComposition) {
    return CAMERA_TARGETS.center;
  }

  const compositionWidth = sceneComposition.offsetWidth;
  const compositionHeight = sceneComposition.offsetHeight;
  const elementCenterX = focusElement.offsetLeft + focusElement.offsetWidth / 2;
  const elementCenterY = focusElement.offsetTop + focusElement.offsetHeight / 2;
  const desiredViewportX = window.innerWidth * config.viewportX;
  const desiredViewportY = window.innerHeight * config.viewportY;

  const x =
    desiredViewportX -
    window.innerWidth / 2 -
    config.scale * (elementCenterX - compositionWidth / 2);
  const y =
    desiredViewportY -
    window.innerHeight / 2 -
    config.scale * (elementCenterY - compositionHeight / 2);

  return {
    x: `${x}px`,
    y: `${y}px`,
    scale: config.scale,
  };
}

function getResolvedTarget(rawHash) {
  const target = rawHash.replace("#", "") || CENTER_TARGET;
  return VALID_TARGETS.has(target) ? target : CENTER_TARGET;
}

function getIntroProgress() {
  if (!scene) {
    return 1;
  }

  const scrollRange = Math.max(scene.offsetHeight - window.innerHeight, 1);
  return clamp(-scene.getBoundingClientRect().top / scrollRange, 0, 1);
}

function setCameraViewport(viewport, animate) {
  if (!sceneCamera) {
    return;
  }

  sceneCamera.classList.toggle("is-animated", animate);
  sceneCamera.style.setProperty("--camera-x", viewport.x);
  sceneCamera.style.setProperty("--camera-y", viewport.y);
  sceneCamera.style.setProperty("--camera-scale", viewport.scale);
}

function applyBodyClasses() {
  const focusClasses = [
    "is-center",
    "is-about",
    "is-projects",
    "is-work",
    "is-extracurriculars",
    "is-focused",
    "is-intro",
    "is-hub",
  ];

  document.body.classList.remove(...focusClasses);
  document.body.classList.add(`is-${state.target}`);

  if (state.mode === "focused") {
    document.body.classList.add("is-focused");
  } else if (state.mode === "intro") {
    document.body.classList.add("is-intro");
  } else {
    document.body.classList.add("is-hub");
  }
}

function syncActiveLinks() {
  categoryLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${state.target}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateIntroCamera() {
  if (!DESKTOP_QUERY.matches || state.target !== CENTER_TARGET) {
    return;
  }

  state.introProgress = getIntroProgress();
  state.mode = state.introProgress >= 1 ? "hub" : "intro";

  const scale = INTRO_SCALE_START - state.introProgress * (INTRO_SCALE_START - HUB_SCALE);
  setCameraViewport({ x: "0vw", y: "0vh", scale }, false);
  applyBodyClasses();
  syncActiveLinks();
}

function scrollToHub() {
  if (!scene) {
    return;
  }

  const hubTop = scene.offsetTop + scene.offsetHeight - window.innerHeight;
  window.scrollTo({ top: hubTop, behavior: "smooth" });
}

function applyTarget(target, options = {}) {
  const { animate = true, previousTarget = state.target } = options;

  state.target = target;

  if (target === CENTER_TARGET) {
    const progress = getIntroProgress();

    if (previousTarget !== CENTER_TARGET) {
      state.mode = "hub";
      state.lockedCenterTransition = progress < 1;
      setCameraViewport(getViewportTarget(CENTER_TARGET), true);
      applyBodyClasses();
      syncActiveLinks();
      if (state.lockedCenterTransition) {
        scrollToHub();
      }
      return;
    }

    state.lockedCenterTransition = false;
    updateIntroCamera();
    return;
  }

  state.mode = "focused";
  state.lockedCenterTransition = false;
  state.introProgress = getIntroProgress();
  setCameraViewport(getViewportTarget(target), animate);
  applyBodyClasses();
  syncActiveLinks();
}

function navigateToTarget(target, method) {
  const nextHash = `#${target}`;
  const currentHash = window.location.hash || "#center";

  if (currentHash === nextHash) {
    applyTarget(target, { animate: true });
    return;
  }

  history[method](null, "", nextHash);
  applyTarget(target, { animate: true });
}

function syncFromLocation(previousTarget = state.target) {
  const target = getResolvedTarget(window.location.hash);

  if (window.location.hash !== `#${target}`) {
    history.replaceState(null, "", `#${target}`);
  }

  applyTarget(target, {
    animate: target !== CENTER_TARGET,
    previousTarget,
  });
}

function handleLinkClick(event) {
  const link = event.target.closest(".category-link, .back-to-center");

  if (!link || !DESKTOP_QUERY.matches) {
    return;
  }

  event.preventDefault();
  const target = getResolvedTarget(link.getAttribute("href") || "#center");
  navigateToTarget(target, "pushState");
}

function handleScroll() {
  if (!DESKTOP_QUERY.matches || state.target !== CENTER_TARGET) {
    return;
  }

  if (state.lockedCenterTransition) {
    if (getIntroProgress() >= 0.995) {
      state.lockedCenterTransition = false;
      updateIntroCamera();
    }
    return;
  }

  updateIntroCamera();
}

function handlePopState() {
  syncFromLocation();
}

function handleResize() {
  if (!DESKTOP_QUERY.matches) {
    sceneCamera?.classList.remove("is-animated");
    sceneCamera?.style.removeProperty("--camera-x");
    sceneCamera?.style.removeProperty("--camera-y");
    sceneCamera?.style.removeProperty("--camera-scale");
    return;
  }

  syncFromLocation();
}

document.addEventListener("click", handleLinkClick);
window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", handleResize);
window.addEventListener("popstate", handlePopState);
window.addEventListener("hashchange", handlePopState);
DESKTOP_QUERY.addEventListener("change", handleResize);

if (!window.location.hash) {
  history.replaceState(null, "", "#center");
}

syncFromLocation(CENTER_TARGET);
