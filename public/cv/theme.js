(function () {
  let theme = "light";
  try {
    const saved = localStorage.getItem("cv-theme");
    if (saved === "light" || saved === "dark") theme = saved;
  } catch {}
  document.documentElement.dataset.theme = theme;
})();
