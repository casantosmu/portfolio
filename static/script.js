const projects = document.querySelectorAll(".js-project");

const filter = document.querySelector("#projects-filter");
const checkboxes = filter.querySelectorAll("input[type='checkbox']");
const allCheckbox = filter.querySelector("input[value='all']");

const selectedTags = new Set();

filter.addEventListener("click", (event) => {
  const target = event.target;

  if (target === allCheckbox) {
    selectedTags.clear();

    for (const project of projects) {
      project.style.display = "";
    }
    for (const checkbox of checkboxes) {
      checkbox.checked = false;
    }

    allCheckbox.checked = true;
    return;
  }

  if (target.type === "checkbox") {
    const tag = target.value;

    if (target.checked) {
      selectedTags.add(tag);
    } else {
      selectedTags.delete(tag);
    }

    const isAll = selectedTags.size === 0;
    for (const project of projects) {
      const projectTags = project.dataset.tags.slice(1, -1).split(" ");
      const matches = projectTags.some((tag) => selectedTags.has(tag));
      project.style.display = matches || isAll ? "" : "none";
    }

    allCheckbox.checked = isAll;
  }
});
