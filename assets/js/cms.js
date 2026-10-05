import {
  ADMIN_EMAIL,
  NEWS_IMAGE_BUCKET,
} from "./supabase-config.js";
import {
  isSupabaseConfigured,
  requireSupabase,
} from "./supabase-client.js";

const categories = {
  varanasi: "वाराणसी",
  "uttar-pradesh": "उत्तर प्रदेश",
  desh: "देश",
  rajneeti: "राजनीति",
  apradh: "अपराध",
  mumbai: "मुंबई",
  video: "वीडियो",
};

function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
  element.setAttribute("role", "status");
}

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

function validatedHttpUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("वीडियो लिंक के लिए केवल http या https URL स्वीकार्य है।");
  }
  return url.href;
}

async function guardAdminPage() {
  const page = document.querySelector("[data-admin-page]");
  if (!page) return null;
  if (!isSupabaseConfigured) {
    location.replace("login.html");
    return null;
  }
  const client = requireSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) {
    console.error("Could not verify admin session:", error.message);
    location.replace("login.html");
    return null;
  }
  if (!session) {
    location.replace("login.html");
    return null;
  }
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      console.error("Could not sign out unauthorized admin session:", signOutError.message);
    }
    location.replace("login.html");
    return null;
  }
  page.hidden = false;
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.replace("login.html");
  });
  return client;
}

async function setupLogin() {
  const form = document.querySelector("[data-admin-login]");
  if (!form) return;
  const message = form.querySelector("[data-login-message]");
  const submit = form.querySelector('button[type="submit"]');
  if (!isSupabaseConfigured) {
    setMessage(message, "Supabase authentication is not configured. Please contact the site administrator.", true);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage(message, "Supabase authentication is not configured. Please contact the site administrator.", true);
      return;
    }
    submit.disabled = true;
    setMessage(message, "प्रमाणीकरण जारी है...");
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    const client = requireSupabase();
    let data;
    let error;
    try {
      ({ data, error } = await client.auth.signInWithPassword({ email, password }));
    } catch (authError) {
      console.error("Supabase authentication request failed:", authError);
      setMessage(message, "प्रमाणीकरण सेवा उपलब्ध नहीं है। कृपया पुनः प्रयास करें।", true);
      submit.disabled = false;
      return;
    }
    if (error || !data.user) {
      setMessage(message, "Invalid admin credentials.", true);
      submit.disabled = false;
      return;
    }
    if (data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
      setMessage(message, "Unauthorized admin account.", true);
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) {
        console.error("Could not sign out unauthorized user:", signOutError.message);
      }
      window.setTimeout(() => location.replace("login.html"), 1200);
      return;
    }
    location.replace("admin.html");
  });
}

function dateTimeDefaults(form) {
  const now = new Date();
  form.elements.news_date.value = now.toLocaleDateString("en-CA");
  form.elements.news_time.value = now.toTimeString().slice(0, 5);
}

async function uploadImage(client, file, userId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await client.storage.from(NEWS_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = client.storage.from(NEWS_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function setupNewsForm(client) {
  const form = document.querySelector("[data-news-form]");
  if (!form) return;
  const message = form.querySelector("[data-form-message]");
  const fileInput = form.elements.image;
  const preview = form.querySelector("[data-image-preview]");
  const editId = form.elements.id;
  dateTimeDefaults(form);

  fileInput.addEventListener("change", () => {
    const [file] = fileInput.files;
    if (!file) {
      preview.hidden = true;
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  form.addEventListener("reset", () => {
    editId.value = "";
    form.querySelector("[data-submit-label]").textContent = "Publish";
    preview.hidden = true;
    setTimeout(() => dateTimeDefaults(form), 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setMessage(message, "खबर सेव हो रही है...");
    let uploadedImage = null;
    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        throw new Error("Admin session is no longer valid. Please sign in again.");
      }
      const imageFile = fileInput.files[0];
      let imageUrl = form.dataset.currentImage || null;
      if (imageFile) {
        imageUrl = await uploadImage(client, imageFile, user.id);
        uploadedImage = imageUrl;
      }

      const payload = {
        title: form.elements.title.value.trim(),
        description: form.elements.description.value.trim(),
        content: form.elements.content.value.trim(),
        category: form.elements.category.value,
        location: form.elements.location.value.trim(),
        news_date: form.elements.news_date.value,
        news_time: form.elements.news_time.value,
        image_url: imageUrl,
        video_url: validatedHttpUrl(form.elements.video_url.value.trim()),
        published: form.elements.published.checked,
      };
      let result;
      if (editId.value) {
        result = await client.from("news").update(payload).eq("id", editId.value).select("id").single();
      } else {
        result = await client.from("news").insert(payload);
      }
      if (result.error) throw result.error;
      setMessage(message, "खबर सफलतापूर्वक सेव हो गई।");
      form.reset();
      form.dataset.currentImage = "";
      await loadManagedNews(client);
    } catch (error) {
      if (uploadedImage) {
        const path = uploadedImage.split(`/${NEWS_IMAGE_BUCKET}/`).pop();
        if (path) {
          const { error: cleanupError } = await client.storage.from(NEWS_IMAGE_BUCKET).remove([decodeURIComponent(path)]);
          if (cleanupError) console.error("Could not clean up the unused uploaded image:", cleanupError.message);
        }
      }
      console.error("Could not save news:", error.message);
      setMessage(message, error.message || "खबर सेव नहीं हो सकी।", true);
    } finally {
      submit.disabled = false;
    }
  });
}

async function loadManagedNews(client) {
  const list = document.querySelector("[data-managed-news]");
  if (!list) return;
  const { data, error } = await client
    .from("news")
    .select("id,title,category,news_date,published,description,content,location,news_time,image_url,video_url")
    .order("created_at", { ascending: false });
  if (error) {
    setMessage(list, "খবরের তালিকা लोड नहीं हो सकी।", true);
    console.error("Could not load news management list:", error.message);
    return;
  }
  if (!data.length) {
    list.innerHTML = "<p>अभी कोई खबर प्रकाशित नहीं है।</p>";
    return;
  }
  list.innerHTML = data.map((news) => `<article class="managed-news" data-news-id="${escapeHtml(news.id)}"><div><strong>${escapeHtml(news.title)}</strong><p>${escapeHtml(categories[news.category])} • ${escapeHtml(formatDate(news.news_date))} • ${news.published ? "Published" : "Draft"}</p></div><div class="managed-actions"><button type="button" class="tool-btn" data-edit-news="${escapeHtml(news.id)}">Edit</button><button type="button" class="tool-btn" data-delete-news="${escapeHtml(news.id)}">Delete</button></div></article>`).join("");
  list._newsItems = data;
}

async function setupAdmin() {
  const client = await guardAdminPage();
  if (!client) return;
  document.querySelectorAll("[data-admin-logout]").forEach((logout) => {
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      const { error } = await client.auth.signOut();
      if (error) {
        console.error("Could not sign out:", error.message);
        logout.disabled = false;
        return;
      }
      location.replace("login.html");
    });
  });

  await setupNewsForm(client);
  await loadManagedNews(client);
  document.querySelector("[data-managed-news]")?.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-news]");
    const deleteButton = event.target.closest("[data-delete-news]");
    const list = event.currentTarget;
    if (editButton) {
      const news = list._newsItems?.find((item) => item.id === editButton.dataset.editNews);
      if (!news) return;
      const form = document.querySelector("[data-news-form]");
      for (const field of ["title", "description", "content", "category", "location", "news_date", "news_time", "video_url"]) {
        form.elements[field].value = news[field] || "";
      }
      form.elements.published.checked = news.published;
      form.elements.id.value = news.id;
      form.dataset.currentImage = news.image_url || "";
      form.querySelector("[data-submit-label]").textContent = "Update";
      const preview = form.querySelector("[data-image-preview]");
      preview.src = news.image_url || "";
      preview.hidden = !news.image_url;
      form.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (deleteButton && confirm("क्या आप इस खबर को हटाना चाहते हैं?")) {
      const news = list._newsItems?.find((item) => item.id === deleteButton.dataset.deleteNews);
      const { error } = await client.from("news").delete().eq("id", deleteButton.dataset.deleteNews);
      if (error) {
        console.error("Could not delete news:", error.message);
        alert("खबर हटाई नहीं जा सकी।");
        return;
      }
      if (news?.image_url) {
        const { count, error: referenceError } = await client
          .from("news")
          .select("id", { count: "exact", head: true })
          .eq("image_url", news.image_url);
        if (referenceError) {
          console.error("News was deleted, but image usage could not be checked:", referenceError.message);
          await loadManagedNews(client);
          return;
        }
        if (count > 0) {
          await loadManagedNews(client);
          return;
        }
        const path = news.image_url.split(`/${NEWS_IMAGE_BUCKET}/`).pop();
        if (path) {
          const { error: storageError } = await client.storage.from(NEWS_IMAGE_BUCKET).remove([decodeURIComponent(path)]);
          if (storageError) console.error("News was deleted, but its image could not be removed:", storageError.message);
        }
      }
      await loadManagedNews(client);
    }
  });
}

function setupNavigation() {
  const currentPage = location.pathname.split("/").pop();
  document.querySelectorAll(".nav a[href]").forEach((link) => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });
}

async function start() {
  setupNavigation();
  await setupLogin();
  await setupAdmin();
}

start().catch((error) => {
  console.error("News Action CMS could not start:", error);
});
