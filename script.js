// Навигация и меню
const slidesContainer = document.getElementById("slides-container");
let slides = [];
let current = 0;

function parseMarkdown(markdown) {
  const slides = markdown
    .split("---")
    .map((slide) => slide.trim())
    .filter((slide) => slide.length > 0);

  return slides.map((slide, index) => {
    const isDivider =
      slide.includes("№ РАЗДЕЛ") || slide.includes("№ ЗАКЛЮЧЕНИЕ");

    let html = slide;

    if (isDivider) {
      const lines = slide.split("\n");
      let sectionNumber = "";
      let sectionTitle = "";
      let subtitle = "";

      lines.forEach((line) => {
        if (line.includes("№ РАЗДЕЛ")) {
          const match = line.match(/РАЗДЕЛ (\d+)/);
          if (match) sectionNumber = match[1];
        } else if (line.includes("###")) {
          subtitle = line.replace("###", "").trim();
        } else if (line.includes("##") && !line.includes("№ РАЗДЕЛ")) {
          sectionTitle = line.replace("##", "").trim();
        }
      });

      html = `
        <div class="content">
          <div class="section-number">${sectionNumber || ""}</div>
          <h2>${sectionTitle || "РАЗДЕЛ"}</h2>
          ${subtitle ? `<h3>${subtitle}</h3>` : ""}
        </div>
      `;

      return `<div class="divider-slide">${html}</div>`;
    }

    html = html
      .replace(/\$\$(.*?)\$\$/gs, "\\[$1\\]")
      .replace(/\$(.*?)\$/g, "\\($1\\)");

    html = html
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(
        /```javascript\n([\s\S]*?)```/g,
        '<pre class="code-block"><code class="javascript">$1</code></pre>'
      )
      .replace(
        /```([\s\S]*?)```/g,
        '<pre class="code-block"><code>$1</code></pre>'
      );

    html = html.replace(/<div class="(?!latex-block)[^"]*">/g, "");
    html = html.replace(/<\/div>(?!\s*<)/g, "");

    const lines = html.split("\n");
    let result = "";
    let currentParagraph = "";

    lines.forEach((line) => {
      line = line.trim();
      if (line === "" || line === "<br>") {
        if (currentParagraph) {
          result += "<p>" + currentParagraph + "</p>\n";
          currentParagraph = "";
        }
      } else if (
        line.startsWith("<") ||
        line.startsWith("[") ||
        line.startsWith("**Пример") ||
        line.startsWith("**Дана система") ||
        line.startsWith("**Ответ:") ||
        line.startsWith("**Шаг") ||
        line.startsWith("**Расширенная")
      ) {
        if (currentParagraph) {
          result += "<p>" + currentParagraph + "</p>\n";
          currentParagraph = "";
        }
        if (
          line.startsWith("**Пример") ||
          line.startsWith("**Дана система") ||
          line.startsWith("**Ответ:") ||
          line.startsWith("**Шаг") ||
          line.startsWith("**Расширенная")
        ) {
          result +=
            "<p><strong>" + line.replace(/\*\*/g, "") + "</strong></p>\n";
        } else if (line.startsWith("[")) {
          result += '<div class="matrix"><p>' + line + "</p></div>\n";
        } else {
          result += line + "\n";
        }
      } else {
        if (currentParagraph) {
          currentParagraph += " " + line;
        } else {
          currentParagraph = line;
        }
      }
    });

    if (currentParagraph) {
      result += "<p>" + currentParagraph + "</p>\n";
    }

    return result;
  });
}

function buildSlides(htmlArray) {
  slidesContainer.innerHTML = "";
  slides = [];

  htmlArray.forEach((html, i) => {
    const section = document.createElement("section");
    section.classList.add("slide");

    if (html.includes("divider-slide")) {
      section.classList.add("divider-slide");
    }

    section.dataset.index = i;
    section.innerHTML = html;
    slidesContainer.appendChild(section);
    slides.push(section);
  });

  updateNumber();
  createMenu();
  goToSlide(0);

  renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
    ],
    throwOnError: false,
  });
}

function createMenu() {
  const oldMenuButton = document.getElementById("menuButton");
  const oldMenuDropdown = document.getElementById("menuDropdown");
  if (oldMenuButton) oldMenuButton.remove();
  if (oldMenuDropdown) oldMenuDropdown.remove();

  const menuButton = document.createElement("button");
  menuButton.id = "menuButton";
  menuButton.textContent = "☰";

  const menuDropdown = document.createElement("div");
  menuDropdown.id = "menuDropdown";

  slides.forEach((slide, i) => {
    const link = document.createElement("a");
    link.href = "#";

    let slideTitle = "";
    const isDivider = slide.classList.contains("divider-slide");

    if (isDivider) {
      const h2 = slide.querySelector("h2");
      const h3 = slide.querySelector("h3");
      slideTitle = h2 ? h2.textContent : "Разделительный слайд";
      if (h3) slideTitle += ": " + h3.textContent;
    } else {
      const h1 = slide.querySelector("h1");
      const h2 = slide.querySelector("h2");
      const h3 = slide.querySelector("h3");

      if (h1) slideTitle = h1.textContent;
      else if (h2) slideTitle = h2.textContent;
      else if (h3) slideTitle = h3.textContent;
      else slideTitle = `Слайд ${i + 1}`;
    }

    if (slideTitle.length > 40) {
      slideTitle = slideTitle.substring(0, 37) + "...";
    }

    link.textContent = `${i + 1}. ${slideTitle}`;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      goToSlide(i);
      menuDropdown.style.display = "none";
    });
    menuDropdown.appendChild(link);
  });

  document.body.appendChild(menuButton);
  document.body.appendChild(menuDropdown);

  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.style.display =
      menuDropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    menuDropdown.style.display = "none";
  });
}

function updateNumber() {
  document.getElementById("slideNumber").textContent =
    current + 1 + " / " + slides.length;
}

function goToSlide(idx) {
  if (idx < 0 || idx >= slides.length) return;

  current = idx;

  slidesContainer.scrollLeft = slides[idx].offsetLeft;

  updateNumber();
}

async function loadMarkdown() {
  try {
    const response = await fetch("presentation.md");
    if (!response.ok) {
      throw new Error("Не удалось загрузить файл");
    }
    const markdown = await response.text();
    return markdown;
  } catch (error) {
    console.error("Ошибка:", error);
    return `
# Ошибка загрузки
Проверьте наличие файла presentation.md
`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const markdown = await loadMarkdown();
  const htmlSlides = parseMarkdown(markdown);

  buildSlides(htmlSlides);

  if (typeof insertForm !== "undefined") {
    insertForm();
  }

  document
    .getElementById("prev")
    .addEventListener("click", () => goToSlide(current - 1));
  document
    .getElementById("next")
    .addEventListener("click", () => goToSlide(current + 1));

  document.addEventListener("keydown", (e) => {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "INPUT")
    ) {
      return;
    }

    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
      goToSlide(current + 1);
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      goToSlide(current - 1);
    }
    if (e.key === "Escape") {
      const menuDropdown = document.getElementById("menuDropdown");
      if (menuDropdown) menuDropdown.style.display = "none";
    }
    if (e.key === "Home") {
      goToSlide(0);
    }
    if (e.key === "End") {
      goToSlide(slides.length - 1);
    }
  });
});
