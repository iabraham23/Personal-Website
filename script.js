const scene = document.querySelector(".scene");
const composition = document.querySelector(".scene-composition");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateScene() {
  if (!scene || !composition) {
    return;
  }

  const progress = clamp(
    -scene.getBoundingClientRect().top / (scene.offsetHeight - window.innerHeight),
    0,
    1
  );

  const scale = 1.9 - progress * 1.1;
  composition.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

updateScene();

window.addEventListener("scroll", updateScene, { passive: true });
window.addEventListener("resize", updateScene);
