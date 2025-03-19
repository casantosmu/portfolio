const projects = document.querySelectorAll(".js-project");
const filter = document.querySelector("#projects-filter");
const allCheckbox = filter.querySelector("input[value='all']");

filter.addEventListener("click", (event) => {
  const target = event.target;
  if (target.type !== "radio") {
    return;
  }

  const isAll = target.value === "all";

  for (const project of projects) {
    const projectTags = project.dataset.tags.slice(1, -1).split(" ");
    const matches = projectTags.some((tag) => tag === target.value);
    project.style.display = matches || isAll ? "" : "none";
  }
});
