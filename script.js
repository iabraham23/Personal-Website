const intro = document.querySelector(".intro");
const centerTitle = document.querySelector(".center-title");

window.addEventListener(
  "scroll",
  () => {
    if (!intro || !centerTitle) {
      return;
    }

    const progress = Math.min(
      Math.max(
        -intro.getBoundingClientRect().top /
          (intro.offsetHeight - window.innerHeight),
        0
      ),
      1
    );

    const scale = 1.4 - progress * 1.0;
    centerTitle.style.transform = `scale(${scale})`;
  },
  { passive: true }
);
