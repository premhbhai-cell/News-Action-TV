import { newsData } from "./news-data.js";

const categoryLabels = {
  varanasi: "वाराणसी",
  "uttar-pradesh": "उत्तर प्रदेश",
  desh: "देश",
  rajneeti: "राजनीति",
  apradh: "अपराध",
  mumbai: "मुंबई",
  video: "वीडियो",
};
const PAGE_SIZE = 8;
const MINI_LIST_SIZE = 3;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function orderedNews(category) {
  return newsData
    .filter((news) => news.published && (category === "all" || news.category === category))
    .sort((first, second) => {
      const dateOrder = second.news_date.localeCompare(first.news_date);
      if (dateOrder) return dateOrder;
      return second.news_time.localeCompare(first.news_time);
    });
}

function renderNewsCard(news) {
  const image = escapeHtml(news.image_url || "assets/images/news/default-news.jpg");
  const title = escapeHtml(news.title);
  const description = escapeHtml(news.description);
  const category = escapeHtml(categoryLabels[news.category] || news.category);
  const date = escapeHtml(formatDate(news.news_date));
  const time = escapeHtml(news.news_time || "");
  const location = escapeHtml(news.location || "");
  const articleUrl = `article.html?id=${encodeURIComponent(news.id)}`;

  if (news.category === "video") {
    return `<article class="video-card"><div class="video-thumb"><img src="${image}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/news/default-news.jpg';" /><div class="play-badge"><span><i class="fa-solid fa-play"></i></span></div></div><div class="video-details"><h3>${title}</h3><p>${date}${time ? ` • ${time}` : ""}${location ? ` • ${location}` : ""}</p><a href="${articleUrl}" class="video-link">और पढ़ें</a></div></article>`;
  }

  return `<article class="story-card"><img src="${image}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/news/default-news.jpg';" /><div class="body"><span class="category-label">${category}</span><h3>${title}</h3><p>${description}</p><div class="meta"><span>${location || category}</span><span>${date}${time ? ` • ${time}` : ""}</span></div><a href="${articleUrl}" class="tool-btn primary read-more">और पढ़ें</a></div></article>`;
}

function renderMiniStory(news) {
  const image = escapeHtml(news.image_url || "assets/images/news/default-news.jpg");
  const title = escapeHtml(news.title);
  const description = escapeHtml(news.description);
  return `<article class="mini-story"><img src="${image}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='assets/images/news/default-news.jpg';" /><div><h4>${title}</h4><p>${description}</p></div></article>`;
}

function setListMessage(target, message) {
  const paragraph = document.createElement("p");
  paragraph.className = "cms-message news-list-message";
  paragraph.setAttribute("role", "status");
  paragraph.textContent = message;
  target.replaceChildren(paragraph);
}

function addLoadMore(target, news, renderCard) {
  let offset = PAGE_SIZE;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool-btn load-more-news i18n";
  button.dataset.hi = "और खबरें देखें";
  button.dataset.en = "Load More";
  button.textContent = document.documentElement.lang === "en"
    ? button.dataset.en
    : button.dataset.hi;
  button.hidden = offset >= news.length;
  target.insertAdjacentElement("afterend", button);
  button.addEventListener("click", () => {
    const nextBatch = news.slice(offset, offset + PAGE_SIZE);
    target.insertAdjacentHTML("beforeend", nextBatch.map(renderCard).join(""));
    offset += nextBatch.length;
    button.hidden = offset >= news.length;
  });
}

function loadNewsLists() {
  const targets = document.querySelectorAll("[data-news-list], [data-video-list]");
  for (const target of targets) {
    const category = target.dataset.category || document.body.dataset.category || "all";
    const mini = target.dataset.layout === "mini";
    const results = orderedNews(category);
    const renderCard = mini ? renderMiniStory : renderNewsCard;
    const visibleNews = results.slice(0, mini ? MINI_LIST_SIZE : PAGE_SIZE);

    if (!visibleNews.length) {
      setListMessage(
        target,
        category === "all"
          ? "अभी कोई प्रकाशित खबर उपलब्ध नहीं है।"
          : "इस श्रेणी में अभी कोई खबर उपलब्ध नहीं है।",
      );
      continue;
    }

    target.innerHTML = visibleNews.map(renderCard).join("");
    if (!mini && target.hasAttribute("data-load-more") && results.length > PAGE_SIZE) {
      addLoadMore(target, results, renderCard);
    }
  }
}

function renderArticleDetail() {
  const target = document.querySelector("[data-article-detail]");
  if (!target) return;

  const id = new URLSearchParams(location.search).get("id");
  const article = newsData.find((news) => news.id === id && news.published);
  if (!article) {
    target.hidden = false;
    setListMessage(target, "यह खबर उपलब्ध नहीं है।");
    for (const sibling of target.parentElement.children) {
      if (sibling !== target) sibling.hidden = true;
    }
    return;
  }

  const category = escapeHtml(categoryLabels[article.category] || article.category);
  const title = escapeHtml(article.title);
  const pageUrl = new URL(location.href);
  pageUrl.searchParams.set("id", article.id);
  const shareUrl = encodeURIComponent(pageUrl.href);
  const shareText = encodeURIComponent(article.title);
  const relatedNews = orderedNews(article.category)
    .filter((news) => news.id !== article.id)
    .slice(0, 3);
  const related = relatedNews.length
    ? `<section class="related-news"><h2>संबंधित खबरें</h2><div class="story-grid">${relatedNews.map(renderNewsCard).join("")}</div></section>`
    : "";

  target.innerHTML = `<div class="article-hero"><img src="${escapeHtml(article.image_url || "assets/images/news/default-news.jpg")}" alt="${title}" onerror="this.onerror=null;this.src='assets/images/news/default-news.jpg';" /></div><article class="article-body"><div class="top-meta">${category} • ${escapeHtml(formatDate(article.news_date))} • ${escapeHtml(article.news_time)} • ${escapeHtml(article.location)}</div><h1>${title}</h1><p class="article-description">${escapeHtml(article.description)}</p><div class="article-content">${escapeHtml(article.content).replace(/\n/g, "<br>")}</div><div class="article-share"><strong>इस खबर को साझा करें</strong><a target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${shareText}%20${shareUrl}">WhatsApp</a><a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}">Facebook</a><a target="_blank" rel="noopener noreferrer" href="https://x.com/intent/post?text=${shareText}&url=${shareUrl}">X</a></div>${related}</article>`;
  target.hidden = false;
  for (const sibling of target.parentElement.children) {
    if (sibling !== target) sibling.hidden = true;
  }
  document.title = `${article.title} | NEWS ACTION TV`;
}

function setupNavigation() {
  const currentPage = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a[href], .side-list a[href]").forEach((link) => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });
}

setupNavigation();
loadNewsLists();
renderArticleDetail();
