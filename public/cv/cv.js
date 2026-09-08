const themeButtons = document.querySelectorAll(".theme-toggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.hidden = false;
    button.setAttribute("aria-pressed", String(theme === "dark"));
    button.querySelector("span").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  });
}

applyTheme(document.documentElement.dataset.theme || "light");
themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try { localStorage.setItem("cv-theme", theme); } catch {}
  });
});

const sectionLinks = document.querySelectorAll(".section-nav a");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const current = entries.find((entry) => entry.isIntersecting);
    if (!current) return;
    sectionLinks.forEach((link) => {
      if (link.hash === `#${current.target.id}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }, { rootMargin: "-15% 0px -55% 0px" });
  document.querySelectorAll("main > section[id]").forEach((section) => observer.observe(section));
}

const rail = document.querySelector("#project-rail");
if (rail) {
  const cards = [...rail.querySelectorAll(".card")];
  const filters = document.querySelectorAll("[data-filter]");
  const search = document.querySelector("#project-search");
  const previous = document.querySelector("#previous-projects");
  const next = document.querySelector("#next-projects");
  const position = document.querySelector("#project-position");
  const empty = document.querySelector(".empty-projects");
  const mobile = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let category = "All";
  let matching = cards;
  let pages = [];
  let pageIndex = 0;
  let perPage = mobile.matches ? 1 : 3;

  document.querySelector(".project-tools").hidden = false;
  document.querySelector(".project-controls").hidden = false;

  function pageOffset(index) {
    return pages[index].offsetLeft - pages[0].offsetLeft;
  }

  function updatePosition() {
    if (!pages.length) {
      position.textContent = "0 projects";
      previous.disabled = true;
      next.disabled = true;
      return;
    }
    pageIndex = pages.reduce((closest, page, index) =>
      Math.abs(pageOffset(index) - rail.scrollLeft) < Math.abs(pageOffset(closest) - rail.scrollLeft)
        ? index : closest, 0);
    const start = pageIndex * perPage + 1;
    const end = Math.min((pageIndex + 1) * perPage, matching.length);
    position.textContent = `${start}–${end} of ${matching.length} projects`;
    previous.disabled = pageIndex === 0;
    next.disabled = pageIndex === pages.length - 1;
  }

  function buildPages() {
    perPage = mobile.matches ? 1 : 3;
    const query = search.value.trim().toLowerCase();
    matching = cards.filter((card) =>
      (category === "All" || card.dataset.category === category)
      && card.textContent.toLowerCase().includes(query));
    pages = [];
    for (let index = 0; index < matching.length; index += perPage) {
      const page = document.createElement("div");
      page.className = "three-col";
      page.setAttribute("role", "group");
      page.setAttribute("aria-label", `Project group ${pages.length + 1}`);
      page.append(...matching.slice(index, index + perPage));
      pages.push(page);
    }
    rail.replaceChildren(...pages);
    rail.hidden = matching.length === 0;
    empty.hidden = matching.length !== 0;
    rail.scrollLeft = 0;
    pageIndex = 0;
    updatePosition();
  }

  function move(direction) {
    if (!pages.length) return;
    const target = Math.max(0, Math.min(pages.length - 1, pageIndex + direction));
    rail.scrollTo({ left: pageOffset(target), behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      category = button.dataset.filter;
      filters.forEach((filter) => filter.setAttribute("aria-pressed", String(filter === button)));
      buildPages();
    });
  });
  search.addEventListener("input", buildPages);
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  rail.addEventListener("keydown", (event) => {
    if (event.target !== rail || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") move(-pages.length);
    else if (event.key === "End") move(pages.length);
    else move(event.key === "ArrowRight" ? 1 : -1);
  });
  let scrollFrame;
  rail.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(updatePosition);
  }, { passive: true });
  mobile.addEventListener("change", buildPages);
  window.addEventListener("resize", updatePosition);
  buildPages();
}
