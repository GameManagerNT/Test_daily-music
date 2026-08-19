// 全域狀態管理
let currentPage = 1;
const itemsPerPage = 10;
let historySongs = [];         
let filteredHistorySongs = []; 

// 🛡️ 1. 安全防護：XSS HTML 特殊字元轉義（防範標籤注入）
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 🛡️ 2. 安全防護：URL 規範與偽協議過濾（防範 javascript: 注入）
function sanitizeURL(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url, window.location.origin);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch (e) {
    // URL 解析失敗時退回 # 確保安全
  }
  return '#';
}

// ⚡ 3. 效能優化：Debounce 防抖函式
function debounce(func, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// 🎵 4. 自動解析 YouTube URL 抓取高畫質封面圖片
function getYouTubeCover(url) {
  if (!url) return "https://via.placeholder.com/400x225?text=No+Cover";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return "https://via.placeholder.com/400x225?text=No+Cover";
}

// 🚀 5. 初始化應用程式：讀取 playlist.json 資料
async function initApp() {
  try {
    const response = await fetch('playlist.json');
    if (!response.ok) {
      throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
    }
    const playlist = await response.json();

    // 動態計算大標題的 Day 天數（使用 textContent 確保安全）
    const totalDays = playlist.length;
    const titleEl = document.getElementById("main-title");
    if (titleEl) {
      titleEl.textContent = `🎵 每日一推薦 Day ${totalDays} 🎵`;
    }

    // 取得今日推薦歌曲
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySong = playlist.find(song => song.date === todayStr) || playlist[0];

    // 渲染今日推薦區塊（使用安全的 textContent 與過濾後的 URL）
    document.getElementById("today-date").textContent = todaySong.date ? escapeHTML(todaySong.date) : '----/--/--';
    
    const coverImg = document.getElementById("today-cover");
    coverImg.src = sanitizeURL(getYouTubeCover(todaySong.url));
    coverImg.alt = `${todaySong.title ? escapeHTML(todaySong.title) : '今日推薦'} 封面`;

    const coverLink = document.getElementById("today-cover-link");
    if (coverLink) coverLink.href = sanitizeURL(todaySong.url);

    // 今日標題連結轉義
    const todayTitleEl = document.getElementById("today-title");
    todayTitleEl.innerHTML = `<a href="${sanitizeURL(todaySong.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(todaySong.title)}</a>`;

    document.getElementById("today-artist").textContent = `演唱者：${todaySong.artist ? todaySong.artist : '未知'}`;

    // 歷史清單（扣除今日推薦）
    historySongs = playlist.filter(song => song.date !== todaySong.date);
    filteredHistorySongs = [...historySongs];

    initSearch();
    renderHistoryPage(1);

    // 啟動【具備動態記憶體管理】的 Canvas 背景動畫
    const coverUrls = playlist.map(song => getYouTubeCover(song.url));
    initFallingCovers(coverUrls);

  } catch (error) {
    console.error("載入歌曲資料庫失敗：", error);
    const todayTitleEl = document.getElementById("today-title");
    if (todayTitleEl) todayTitleEl.textContent = "無法載入歌曲資料庫";
  }
}

// 📜 6. 渲染歷史歌曲分頁與搜尋結果
function renderHistoryPage(page) {
  const historyUl = document.getElementById("history-list");
  if (!historyUl) return;

  historyUl.innerHTML = "";

  if (filteredHistorySongs.length === 0) {
    historyUl.innerHTML = `<li class="no-result">無</li>`;
    
    const pageInfoEl = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (pageInfoEl) pageInfoEl.textContent = `第 0 / 0 頁`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  const totalPages = Math.ceil(filteredHistorySongs.length / itemsPerPage) || 1;
  currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageSongs = filteredHistorySongs.slice(startIndex, endIndex);

  // 渲染歷史清單項目（完整 XSS Sanitation 轉義）
  pageSongs.forEach(song => {
    const li = document.createElement("li");
    const songCoverUrl = sanitizeURL(getYouTubeCover(song.url));

    li.innerHTML = `
      <div class="hist-item">
        <img src="${songCoverUrl}" alt="${escapeHTML(song.title)}" class="hist-cover" loading="lazy">
        <span>
          <a href="${sanitizeURL(song.url)}" target="_blank" rel="noopener noreferrer" class="history-link">
            <strong>${escapeHTML(song.title)}</strong>
          </a> - ${escapeHTML(song.artist)}
        </span>
      </div>
      <span class="hist-date">${escapeHTML(song.date)}</span>
    `;
    historyUl.appendChild(li);
  });

  const pageInfoEl = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (pageInfoEl) pageInfoEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  if (prevBtn) prevBtn.disabled = (currentPage === 1);
  if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
}

// 📄 7. 分頁切換
function changePage(direction) {
  renderHistoryPage(currentPage + direction);
}

// 🔍 8. 防抖搜尋監聽事件
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', debounce((e) => {
    const keyword = e.target.value.toLowerCase().trim();

    filteredHistorySongs = historySongs.filter(song =>
      (song.title && song.title.toLowerCase().includes(keyword)) ||
      (song.artist && song.artist.toLowerCase().includes(keyword))
    );

    renderHistoryPage(1);
  }, 200));
}

// ❄️ 9. 高階動態記憶體管理 Canvas 背景動畫 (Texture Pool + Object Pool)
function initFallingCovers(coverUrls) {
  const canvas = document.getElementById("snow-canvas");
  if (!canvas || coverUrls.length === 0) return;

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  let animationFrameId = null;

  // 💡 自適應記憶體控制：依設備 CPU 核心數設定上限
  const cores = navigator.hardwareConcurrency || 4;
  const PARTICLE_COUNT = cores < 4 ? 10 : 20;  
  const MAX_ACTIVE_TEXTURES = PARTICLE_COUNT;  

  // 💡 Texture Pool：記憶體動態分配與顯存釋放
  const texturePool = new Map(); 
  let urlQueue = [...coverUrls].sort(() => Math.random() - 0.5);

  function allocateTexture(url, callback) {
    if (texturePool.has(url)) {
      callback(texturePool.get(url));
      return;
    }

    if (texturePool.size >= MAX_ACTIVE_TEXTURES) {
      freeOldestTexture();
    }

    const img = new Image();
    img.onload = () => {
      texturePool.set(url, img);
      callback(img);
    };
    img.src = url;
  }

  // 主動清空 src 觸發 GPU 顯存回收
  function freeOldestTexture() {
    const firstKey = texturePool.keys().next().value;
    if (firstKey) {
      const imgToFree = texturePool.get(firstKey);
      if (imgToFree) {
        imgToFree.src = ""; // 斷開顯存
      }
      texturePool.delete(firstKey);
    }
  }

  function getNextUrl() {
    if (urlQueue.length === 0) {
      urlQueue = [...coverUrls].sort(() => Math.random() - 0.5);
    }
    return urlQueue.pop();
  }

  function getRandomX() {
    const centerMargin = 320;
    const centerX = width / 2;
    if (Math.random() < 0.5) {
      return Math.random() * Math.max(0, centerX - centerMargin);
    } else {
      const rightStart = centerX + centerMargin;
      return rightStart + Math.random() * Math.max(0, width - rightStart);
    }
  }

  // 💡 Object Pool：重複使用粒子物件，消除垃圾回收 (GC Stop)
  const particlePool = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: getRandomX(),
    y: Math.random() * height - height,
    size: Math.random() * 25 + 35,
    speedY: Math.random() * 0.6 + 0.3,
    speedX: Math.random() * 0.4 - 0.2,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 0.5,
    opacity: Math.random() * 0.2 + 0.25,
    img: null,
    currentUrl: null
  }));

  particlePool.forEach(p => {
    p.currentUrl = getNextUrl();
    allocateTexture(p.currentUrl, (img) => { p.img = img; });
  });

  // 主繪製迴圈
  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particlePool.length; i++) {
      const p = particlePool[i];

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      // 飄出底部：回收座標與重新分配圖片記憶體
      if (p.y > height + p.size) {
        p.y = -p.size;
        p.x = getRandomX();

        const newUrl = getNextUrl();
        p.currentUrl = newUrl;
        allocateTexture(newUrl, (img) => { p.img = img; });
      }

      if (p.img && p.img.complete && p.img.naturalWidth !== 0) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        const aspectHeight = p.size * (9 / 16);
        ctx.drawImage(p.img, -p.size / 2, -aspectHeight / 2, p.size, aspectHeight);
        ctx.restore();
      }
    }

    animationFrameId = requestAnimationFrame(render);
  }

  // 事件監聽與離屏凍結
  window.addEventListener("resize", () => {
    width = (canvas.width = window.innerWidth);
    height = (canvas.height = window.innerHeight);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }
  });

  render();
}

// 頁面 DOM 載入完成後執行
document.addEventListener("DOMContentLoaded", initApp);