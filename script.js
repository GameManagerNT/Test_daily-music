// 全域變數
let currentPage = 1;
const itemsPerPage = 10;
let historySongs = [];         // 歷史歌曲完整清單
let filteredHistorySongs = []; // 搜尋過濾後的歷史歌曲清單

// 1. 自動解析 YouTube URL 抓取高畫質封面圖片
function getYouTubeCover(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return "https://via.placeholder.com/400x225?text=No+Cover";
}

// 2. 初始化應用程式：讀取 playlist.json 資料
async function initApp() {
  try {
    const response = await fetch('playlist.json');
    if (!response.ok) {
      throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
    }
    const playlist = await response.json();

    // 動態計算並更新大標題的 Day 天數
    const totalDays = playlist.length;
    const titleEl = document.getElementById("main-title");
    if (titleEl) {
      titleEl.innerText = `🎵 每日一推薦 Day ${totalDays} 🎵`;
    }

    // 取得今日推薦歌曲 (預設找符合今天日期的，沒有就取第一筆)
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySong = playlist.find(song => song.date === todayStr) || playlist[0];

    // 渲染今日推薦區塊
    document.getElementById("today-date").innerText = todaySong.date;
    
    const coverImg = document.getElementById("today-cover");
    coverImg.src = getYouTubeCover(todaySong.url);
    coverImg.alt = `${todaySong.title} 封面`;

    const coverLink = document.getElementById("today-cover-link");
    if (coverLink) coverLink.href = todaySong.url;

    const todayTitleEl = document.getElementById("today-title");
    todayTitleEl.innerHTML = `<a href="${todaySong.url}" target="_blank" rel="noopener noreferrer">${todaySong.title}</a>`;

    document.getElementById("today-artist").innerText = `演唱者：${todaySong.artist}`;

    // 準備歷史清單（扣除今日推薦）
    historySongs = playlist.filter(song => song.date !== todaySong.date);
    filteredHistorySongs = [...historySongs];

    // 初始化搜尋框監聽事件
    initSearch();

    // 渲染第一頁歷史清單
    renderHistoryPage(1);

    // 啟動背景飄落封面動畫（傳入所有歌曲的封面 URL）
    const coverUrls = playlist.map(song => getYouTubeCover(song.url));
    initFallingCovers(coverUrls);

  } catch (error) {
    console.error("載入歌曲資料庫失敗：", error);
    const todayTitleEl = document.getElementById("today-title");
    if (todayTitleEl) todayTitleEl.innerText = "無法載入歌曲資料庫";
  }
}

// 3. 渲染歷史歌曲分頁與搜尋結果
function renderHistoryPage(page) {
  const historyUl = document.getElementById("history-list");
  if (!historyUl) return;

  historyUl.innerHTML = "";

  // 當搜尋結果為 0 時，顯示「無」
  if (filteredHistorySongs.length === 0) {
    historyUl.innerHTML = `<li class="no-result">無</li>`;
    
    const pageInfoEl = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (pageInfoEl) pageInfoEl.innerText = `第 0 / 0 頁`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  // 計算分頁範圍
  const totalPages = Math.ceil(filteredHistorySongs.length / itemsPerPage) || 1;
  currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageSongs = filteredHistorySongs.slice(startIndex, endIndex);

  // 渲染清單項目
  pageSongs.forEach(song => {
    const li = document.createElement("li");
    const songCoverUrl = getYouTubeCover(song.url);

    li.innerHTML = `
      <div class="hist-item">
        <img src="${songCoverUrl}" alt="${song.title}" class="hist-cover">
        <span>
          <a href="${song.url}" target="_blank" rel="noopener noreferrer" class="history-link">
            <strong>${song.title}</strong>
          </a> - ${song.artist}
        </span>
      </div>
      <span class="hist-date">${song.date}</span>
    `;
    historyUl.appendChild(li);
  });

  // 更新頁碼按鈕狀態
  const pageInfoEl = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (pageInfoEl) pageInfoEl.innerText = `第 ${currentPage} / ${totalPages} 頁`;
  if (prevBtn) prevBtn.disabled = (currentPage === 1);
  if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
}

// 4. 切換頁碼 Function (按鈕 onclick 呼叫)
function changePage(direction) {
  renderHistoryPage(currentPage + direction);
}

// 5. 右上角搜尋監聽事件
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();

    filteredHistorySongs = historySongs.filter(song =>
      song.title.toLowerCase().includes(keyword) ||
      song.artist.toLowerCase().includes(keyword)
    );

    // 搜尋後重置到第 1 頁渲染
    renderHistoryPage(1);
  });
}

// ❄️ 背景封面飄落雪花效果（避開中間卡片 + 封面不重複）
function initFallingCovers(coverUrls) {
  const canvas = document.getElementById("snow-canvas");
  if (!canvas || coverUrls.length === 0) return;

  const ctx = canvas.getContext("2d");
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const loadedImages = [];
  let availableDeck = []; // 尚未使用的封面牌組

  // 💡 不重複抽牌邏輯：當牌組抽空時，重新洗牌
  function getUniqueImage() {
    if (loadedImages.length === 0) return null;
    
    // 如果牌組空了，將所有圖片重新複製一份並洗牌 (Shuffle)
    if (availableDeck.length === 0) {
      availableDeck = [...loadedImages].sort(() => Math.random() - 0.5);
    }
    
    // 每次拿走一張牌，確保不重複
    return availableDeck.pop();
  }

  // 載入封面圖片
  coverUrls.forEach(url => {
    const img = new Image();
    img.onload = () => loadedImages.push(img);
    img.src = url;
  });

  // 取得左右兩側的 X 座標範圍 (避開中間卡片)
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

  const particleCount = 25;
  const particles = [];

  function createParticle() {
    return {
      x: getRandomX(),
      y: Math.random() * height - height,
      size: Math.random() * 30 + 35,
      speedY: Math.random() * 0.6 + 0.3,
      speedX: Math.random() * 0.4 - 0.2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.2 + 0.25,
      img: null
    };
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      // 若粒子還沒有分配到圖片，使用不重複抽牌機制分配
      if (!p.img && loadedImages.length > 0) {
        p.img = getUniqueImage();
      }

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      // 當飄出畫面底部時重置，並重新抽取一張不重複的封面
      if (p.y > height + p.size) {
        p.y = -p.size;
        p.x = getRandomX();
        if (loadedImages.length > 0) {
          p.img = getUniqueImage(); // 👈 取出下一張不重複的圖片
        }
      }

      if (p.img) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        const aspectHeight = p.size * (9 / 16);
        ctx.drawImage(p.img, -p.size / 2, -aspectHeight / 2, p.size, aspectHeight);
        ctx.restore();
      }
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// 當頁面 DOM 載入完畢後執行主函式
document.addEventListener("DOMContentLoaded", initApp);