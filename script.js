// 全域變數
let currentPage = 1;
const itemsPerPage = 10;
let historySongs = [];         // 完整的歷史歌曲陣列
let filteredHistorySongs = []; // 搜尋過濾後的歷史歌曲陣列

// 自動解析 YouTube URL 抓取高畫質封面圖片
function getYouTubeCover(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return "https://via.placeholder.com/400x225?text=No+Cover";
}

// 使用 async/await 非同步讀取外部 playlist.json 資料庫
async function initApp() {
  try {
    const response = await fetch('playlist.json');
    if (!response.ok) {
      throw new Error(`HTTP 錯誤！狀態碼：${response.status}`);
    }
    const playlist = await response.json();

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySong = playlist.find(song => song.date === todayStr) || playlist[0];

    // 1. 渲染今日推薦圖片與連結
    document.getElementById("today-date").innerText = todaySong.date;
    
    const coverImg = document.getElementById("today-cover");
    coverImg.src = getYouTubeCover(todaySong.url);
    coverImg.alt = `${todaySong.title} 封面`;

    const coverLink = document.getElementById("today-cover-link");
    if (coverLink) coverLink.href = todaySong.url;

    const todayTitleEl = document.getElementById("today-title");
    todayTitleEl.innerHTML = `<a href="${todaySong.url}" target="_blank" rel="noopener noreferrer">${todaySong.title}</a>`;

    document.getElementById("today-artist").innerText = `演唱者：${todaySong.artist}`;

    // 2. 準備歷史清單陣列
    historySongs = playlist.filter(song => song.date !== todaySong.date);
    filteredHistorySongs = [...historySongs]; // 預設跟完整列表相同

    // 初始化搜尋監聽器
    initSearch();

    // 渲染第一頁歷史歌曲
    renderHistoryPage(1);

  } catch (error) {
    console.error("載入歌曲資料庫失敗：", error);
    document.getElementById("today-title").innerText = "無法載入歌曲資料庫";
  }
}

// 渲染特定頁碼的歷史歌曲
function renderHistoryPage(page) {
  const historyUl = document.getElementById("history-list");
  historyUl.innerHTML = "";

  // 💡 1. 處理無搜尋結果的情況：顯示「無」
  if (filteredHistorySongs.length === 0) {
    historyUl.innerHTML = `<li class="no-result">無</li>`;
    
    // 更新頁碼狀態
    const pageInfoEl = document.getElementById("page-info");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    if (pageInfoEl) pageInfoEl.innerText = `第 0 / 0 頁`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  // 2. 計算分頁
  const totalPages = Math.ceil(filteredHistorySongs.length / itemsPerPage) || 1;
  currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageSongs = filteredHistorySongs.slice(startIndex, endIndex);

  // 3. 渲染當前頁面的歌曲
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

  // 4. 更新頁碼資訊與按鈕狀態
  const pageInfoEl = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (pageInfoEl) pageInfoEl.innerText = `第 ${currentPage} / ${totalPages} 頁`;
  if (prevBtn) prevBtn.disabled = (currentPage === 1);
  if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
}

// 切換頁碼函式
function changePage(direction) {
  renderHistoryPage(currentPage + direction);
}

// 初始化右上角搜尋欄監聽器
function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();

    // 依歌名或歌手進行過濾
    filteredHistorySongs = historySongs.filter(song =>
      song.title.toLowerCase().includes(keyword) ||
      song.artist.toLowerCase().includes(keyword)
    );

    // 搜尋後自動跳回第 1 頁並重新渲染
    renderHistoryPage(1);
  });
}

document.addEventListener("DOMContentLoaded", initApp);