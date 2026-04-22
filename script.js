const scene = document.querySelector(".scene");
const sceneCamera = document.querySelector(".scene-camera");
const sceneComposition = document.querySelector(".scene-composition");
const categoryLinks = Array.from(document.querySelectorAll(".category-link"));

const DESKTOP_QUERY = window.matchMedia("(min-width: 960px)");
const CENTER_TARGET = "center";
const SCENE_CONFIG = {
  introZoomMultiplier: 3.25,
  sceneWidthMultiplier: 2.55,
  sceneHeightMultiplier: 2.35,
  minSceneWidth: 1800,
  minSceneHeight: 1400,
  hubPaddingX: 88,
  hubPaddingY: 72,
  focusPaddingX: 104,
  focusPaddingY: 88,
};
const VALID_TARGETS = new Set([
  CENTER_TARGET,
  "about",
  "projects",
  "work",
  "extracurriculars",
]);

const FOCUS_LAYOUTS = {
  about: {
    selector: ".about",
    regionSelector: ".about-region",
    anchorX: "right",
    anchorY: "bottom",
    minScale: 0.72,
    maxScale: 0.98,
  },
  projects: {
    selector: ".projects",
    regionSelector: ".projects-region",
    anchorX: "left",
    anchorY: "bottom",
    minScale: 0.72,
    maxScale: 0.98,
  },
  work: {
    selector: ".work",
    regionSelector: ".work-region",
    anchorX: "right",
    anchorY: "top",
    minScale: 0.72,
    maxScale: 1,
  },
  extracurriculars: {
    selector: ".extracurriculars",
    regionSelector: ".extracurriculars-region",
    anchorX: "left",
    anchorY: "top",
    minScale: 0.72,
    maxScale: 0.98,
  },
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

function updateSceneMetrics() {
  if (!sceneComposition || !DESKTOP_QUERY.matches) {
    return;
  }

  const width = Math.max(
    window.innerWidth * SCENE_CONFIG.sceneWidthMultiplier,
    SCENE_CONFIG.minSceneWidth
  );
  const height = Math.max(
    window.innerHeight * SCENE_CONFIG.sceneHeightMultiplier,
    SCENE_CONFIG.minSceneHeight
  );

  sceneComposition.style.setProperty("--scene-width", `${width}px`);
  sceneComposition.style.setProperty("--scene-height", `${height}px`);
}

function getElementBox(element) {
  return {
    left: element.offsetLeft,
    top: element.offsetTop,
    right: element.offsetLeft + element.offsetWidth,
    bottom: element.offsetTop + element.offsetHeight,
  };
}

function getCombinedBox(elements) {
  const boxes = elements.filter(Boolean).map(getElementBox);

  if (!boxes.length) {
    return null;
  }

  return boxes.reduce(
    (combined, box) => ({
      left: Math.min(combined.left, box.left),
      top: Math.min(combined.top, box.top),
      right: Math.max(combined.right, box.right),
      bottom: Math.max(combined.bottom, box.bottom),
    }),
    boxes[0]
  );
}

function getViewportFromBox(box, options = {}) {
  if (!sceneComposition || !box) {
    return { x: 0, y: 0, scale: 1 };
  }

  const {
    viewportX = 0.5,
    viewportY = 0.5,
    anchorX = "center",
    anchorY = "center",
    paddingX = 0,
    paddingY = 0,
    minScale = 0.25,
    maxScale = Infinity,
  } = options;

  const compositionWidth = sceneComposition.offsetWidth;
  const compositionHeight = sceneComposition.offsetHeight;
  const boxWidth = Math.max(box.right - box.left, 1);
  const boxHeight = Math.max(box.bottom - box.top, 1);
  const fitScale = Math.min(
    (window.innerWidth - paddingX * 2) / boxWidth,
    (window.innerHeight - paddingY * 2) / boxHeight
  );
  const scale = clamp(fitScale, minScale, maxScale);
  let boxReferenceX = (box.left + box.right) / 2;
  let boxReferenceY = (box.top + box.bottom) / 2;
  let desiredViewportX = window.innerWidth * viewportX;
  let desiredViewportY = window.innerHeight * viewportY;

  if (anchorX === "left") {
    boxReferenceX = box.left;
    desiredViewportX = paddingX;
  } else if (anchorX === "right") {
    boxReferenceX = box.right;
    desiredViewportX = window.innerWidth - paddingX;
  }

  if (anchorY === "top") {
    boxReferenceY = box.top;
    desiredViewportY = paddingY;
  } else if (anchorY === "bottom") {
    boxReferenceY = box.bottom;
    desiredViewportY = window.innerHeight - paddingY;
  }

  return {
    x:
      desiredViewportX -
      window.innerWidth / 2 -
      scale * (boxReferenceX - compositionWidth / 2),
    y:
      desiredViewportY -
      window.innerHeight / 2 -
      scale * (boxReferenceY - compositionHeight / 2),
    scale,
  };
}

function getHubViewport() {
  const hubElements = [document.querySelector(".center-title"), ...categoryLinks];
  const hubBox = getCombinedBox(hubElements);

  return getViewportFromBox(hubBox, {
    viewportX: 0.5,
    viewportY: 0.5,
    paddingX: SCENE_CONFIG.hubPaddingX,
    paddingY: SCENE_CONFIG.hubPaddingY,
    minScale: 0.42,
    maxScale: 0.9,
  });
}

function getViewportTarget(target) {
  if (target === CENTER_TARGET) {
    return getHubViewport();
  }

  const config = FOCUS_LAYOUTS[target];
  const focusElement = config ? document.querySelector(config.selector) : null;
  const regionElement = config ? document.querySelector(config.regionSelector) : null;
  const focusBox = getCombinedBox([focusElement, regionElement]);
  const viewport = getViewportFromBox(focusBox, {
    anchorX: config?.anchorX,
    anchorY: config?.anchorY,
    paddingX: SCENE_CONFIG.focusPaddingX,
    paddingY: SCENE_CONFIG.focusPaddingY,
    minScale: config?.minScale,
    maxScale: config?.maxScale,
  });

  return {
    x: `${viewport.x}px`,
    y: `${viewport.y}px`,
    scale: viewport.scale,
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

  const x = typeof viewport.x === "number" ? `${viewport.x}px` : viewport.x;
  const y = typeof viewport.y === "number" ? `${viewport.y}px` : viewport.y;

  sceneCamera.classList.toggle("is-animated", animate);
  sceneCamera.style.setProperty("--camera-x", x);
  sceneCamera.style.setProperty("--camera-y", y);
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
  const hubViewport = getHubViewport();
  const introScaleStart = Math.max(
    hubViewport.scale * SCENE_CONFIG.introZoomMultiplier,
    1.9
  );
  const scale =
    introScaleStart -
    state.introProgress * (introScaleStart - hubViewport.scale);
  const x = hubViewport.x * state.introProgress;
  const y = hubViewport.y * state.introProgress;

  setCameraViewport({ x: `${x}px`, y: `${y}px`, scale }, false);
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
    sceneComposition?.style.removeProperty("--scene-width");
    sceneComposition?.style.removeProperty("--scene-height");
    return;
  }

  updateSceneMetrics();
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

updateSceneMetrics();
syncFromLocation(CENTER_TARGET);
