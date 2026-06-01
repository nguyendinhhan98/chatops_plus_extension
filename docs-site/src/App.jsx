import React, { useState } from 'react';
import { 
  CheckSquare, FileText, Bell, Search, Image as ImageIcon, Zap, 
  Settings, Cloud, Globe, ChevronLeft, ChevronRight, X, 
  ArrowUpRight, Info, History, ShieldAlert, Sliders, Menu
} from 'lucide-react';

const TRANSLATIONS = {
  vi: {
    heroTitle: "Hướng Dẫn Sử Dụng",
    heroSubtitle: "Khám phá các phân hệ chức năng và hướng dẫn cấu hình chi tiết của ChatOps++",
    installBtn: "Thêm vào Chrome",
    langToggle: "English",
    changelogTitle: "Nhật Ký Phiên Bản (Changelog)",
    changelogSub: "Theo dõi các cải tiến và cập nhật tính năng mới nhất",
    latestBadge: "Mới nhất",
    imagePending: "Đang chờ tải lên hình ảnh: ",
    lightboxTitle: "Xem ảnh gốc",
    slideProgress: "Hình",
    featureTitle: "TÍNH NĂNG CỐT LÕI",
    setupTitle: "HƯỚNG DẪN CẤU HÌNH",
    versionBadge: "v3.3.9",
    proTip: "Mẹo nhỏ",
    proTipDesc: "Click trực tiếp vào ảnh để xem toàn màn hình ở độ phân giải gốc.",
    footerText: "Được phát triển với 💖 nhằm nâng tầm năng suất làm việc của bạn.",
    
    slides: [
      {
        id: "tasks",
        category: "feature",
        title: "🎯 Quản Lý Tác Vụ (Tasks)",
        badge: "01 / 07",
        desc: "Hệ thống quản lý To-Do list và Checklist con trực quan, giúp gom tụ và theo dõi công việc khoa học ngay trên thanh bên Mattermost.",
        bullets: [
          "Tạo nhanh công việc trực tiếp từ tin nhắn Mattermost thông qua phím tắt.",
          "Checklist con không giới hạn cấp độ giúp phân chia nhỏ đầu việc chi tiết.",
          "Cơ chế đặt giờ nhắc hẹn và báo chuông thời gian thực tránh bỏ lỡ deadline."
        ],
        images: ["/images/tasks_1.png", "/images/tasks_2.png", "/images/tasks_3.png"],
        icon: "tasks"
      },
      {
        id: "notes",
        category: "feature",
        title: "📒 Phân Hệ Ghi Chú & Memos (Notes)",
        desc: "Lưu giữ nhanh thông tin quan trọng, link tài liệu hoặc biên bản cuộc họp chỉ với một chạm.",
        bullets: [
          "Lưu nhanh tin nhắn chat Mattermost vào ghi chú chỉ với 1-click.",
          "Phân loại các ghi chú gọn gàng theo từng Danh mục tự chọn (ví dụ: Công việc, Đời sống).",
          "Bộ lọc tìm kiếm tức thì theo từ khóa trong nội dung và tiêu đề ghi chú."
        ],
        images: ["/images/notes_1.png", "/images/notes_2.png", "/images/notes_3.png"],
        icon: "notes"
      },
      {
        id: "mentions",
        category: "feature",
        title: "🔔 Giám Sát Tin Nhắn Bỏ Lỡ (Mentions)",
        desc: "Hộp thư trung tâm gom tụ toàn bộ tin nhắn nhắc tên (@) và tin nhắn trực tiếp chưa đọc.",
        bullets: [
          "Tóm tắt nội dung các cuộc thảo luận bỏ lỡ một cách ngắn gọn bằng trí tuệ nhân tạo (AI).",
          "Tương tác, thả cảm xúc hoặc trả lời đồng nghiệp trực tiếp từ thanh bên.",
          "Nhấp đúp chuột vào thẻ tin nhắn để nhảy ngay đến kênh chat gốc trên Mattermost."
        ],
        images: ["/images/mentions_1.png", "/images/mentions_2.png", "/images/mentions_3.png"],
        icon: "mentions"
      },
      {
        id: "search",
        category: "feature",
        title: "🔍 Tìm Kiếm Hội Thoại Nâng Cao (Search)",
        desc: "Quét lịch sử tin nhắn trong các kênh với tốc độ cao cùng các bộ lọc tìm kiếm nâng cao.",
        bullets: [
          "Lọc tin nhắn nhanh theo người gửi, kênh và khoảng thời gian.",
          "Xem nhanh các tin nhắn xung quanh ngữ cảnh khớp tìm kiếm.",
          "Hiển thị kết quả tức thì không cần load lại toàn bộ trang chat."
        ],
        images: ["/images/search_1.png", "/images/search_2.png", "/images/search_3.png"],
        icon: "search"
      },
      {
        id: "memes",
        category: "feature",
        title: "🖼️ Thư Viện Meme & Ảnh (Images)",
        desc: "Kho lưu trữ hình ảnh biểu đồ, tài liệu hoặc ảnh chế (meme) cá nhân của bạn.",
        bullets: [
          "1-click để chèn nhanh ảnh vào hộp chat Mattermost.",
          "Hỗ trợ tìm kiếm nhanh meme thông qua tích hợp Giphy API.",
          "Cơ chế tự động nén dung lượng ảnh để tối ưu bộ nhớ tải lên."
        ],
        images: ["/images/meme_1.png", "/images/meme_2.png", "/images/meme_3.png"],
        icon: "memes"
      },
      {
        id: "reactions",
        category: "feature",
        title: "🔥 Bão Cảm Xúc & Phím Tắt Nhanh (Spam)",
        desc: "Tự động thả loạt emoji phản ứng (reaction spam) cực nhanh và thực hiện các lối tắt tạo nhanh dữ liệu.",
        bullets: [
          "Hover chuột trên tin nhắn để mở bảng reactions tùy chọn.",
          "Bấm phím tắt để thu hồi hàng loạt reaction đã thả.",
          "Nút tương tác nhanh ghim ngay trên dòng chat Mattermost."
        ],
        images: ["/images/reactions_1.png", "/images/reactions_2.png", "/images/reactions_3.png"],
        icon: "reactions"
      },
      {
        id: "setup",
        category: "setup",
        title: "⚙️ Cấu Hình Ban Đầu & Cá Nhân Hóa",
        desc: "Tùy biến tối đa thanh bên extension theo nhu cầu công việc của từng cá nhân.",
        bullets: [
          "Bật/tắt riêng lẻ từng nút trong 8 nút tương tác nhanh trên khung chat.",
          "Cài đặt Giphy API Key để tìm kiếm ảnh động GIF chất lượng cao.",
          "Sắp xếp thứ tự ưu tiên các tab tính năng xuất hiện trên menu chính.",
          "Đồng bộ và khôi phục dữ liệu an toàn thông qua Google Drive cá nhân."
        ],
        images: ["/images/settings_1.png", "/images/settings_2.png", "/images/settings_3.png", "/images/settings_4.png"],
        icon: "setup"
      }
    ],

    changelogs: [
      {
        ver: "v3.3.9",
        date: "31/05/2026",
        latest: true,
        logs: [
          { type: "Đặc sắc", text: "Ra mắt giao diện hướng dẫn dạng Slide thuyết trình thiết kế tối giản, trực quan và hiện đại." },
          { type: "Cải tiến", text: "Tối ưu hóa UI/UX các vùng Danh mục, Tab, Hộp thông báo API Giphy trong thanh điều hướng sidebar." }
        ]
      },
      {
        ver: "v3.3.8",
        date: "30/05/2026",
        latest: false,
        logs: [
          { type: "Sửa lỗi", text: "Khắc phục lỗi ghi đè trạng thái hiển thị của các tab ẩn trên thanh menu chính." },
          { type: "Cải tiến", text: "Nâng cấp trải nghiệm kéo thả sắp xếp các tab hiển thị ưu tiên." }
        ]
      },
      {
        ver: "v3.3.0",
        date: "27/05/2026",
        latest: false,
        logs: [
          { type: "Tính năng", text: "Ra mắt phân hệ Bão cảm xúc (Emoji Reactions Spammer) và Hộp thoại tạo nhanh Tác vụ/Ghi chú từ tin nhắn." },
          { type: "Tính năng", text: "Hỗ trợ phím xóa nhanh tác vụ trên tin nhắn và thả emoji trực tiếp trên giao diện Tin nhắn bỏ lỡ." }
        ]
      },
      {
        ver: "v3.0.0",
        date: "26/05/2026",
        latest: false,
        logs: [
          { type: "Tính năng", text: "Tích hợp sao lưu dữ liệu tự động lên Google Drive và công cụ dọn dẹp dung lượng bộ nhớ định kỳ." },
          { type: "Tối ưu", text: "Bổ sung cơ chế tự động nén dung lượng tệp tải lên thư viện hình ảnh Meme." }
        ]
      }
    ]
  },
  en: {
    heroTitle: "Interactive User Guide",
    heroSubtitle: "Explore ChatOps++ feature modules, visual carousels, and personalization settings",
    installBtn: "Add to Chrome",
    langToggle: "Tiếng Việt",
    changelogTitle: "Product Updates & Changelog",
    changelogSub: "Track the evolution and new features of the extension",
    latestBadge: "Latest",
    imagePending: "Image pending upload: ",
    lightboxTitle: "View original image",
    slideProgress: "Screen",
    featureTitle: "CORE FEATURES",
    setupTitle: "CONFIGURATION MANUAL",
    versionBadge: "v3.3.9",
    proTip: "Pro Tip",
    proTipDesc: "Click directly on the image to open the fullscreen lightbox viewer.",
    footerText: "Developed with 💖 to elevate your ultimate workplace productivity.",
    
    slides: [
      {
        id: "tasks",
        category: "feature",
        title: "🎯 Tasks & Checklist Board",
        badge: "01 / 07",
        desc: "Organize To-Do lists, nested sub-checklists, sound alarms, and active browser reminders directly inside Mattermost.",
        bullets: [
          "Create tasks directly from Mattermost chat messages using visual shortcuts.",
          "Support unlimited nested checklists to track modular goals.",
          "Set customized time reminders and alarms so you never miss a deadline."
        ],
        images: ["/images/tasks_1.png", "/images/tasks_2.png", "/images/tasks_3.png"],
        icon: "tasks"
      },
      {
        id: "notes",
        category: "feature",
        title: "📒 Memos & Notes Repository",
        desc: "Capture important notes, links, snippets, or meeting memos from channels in a single click.",
        bullets: [
          "Save messages to notes directly from the chat screen with 1-click.",
          "Organize notes neatly by custom categories (e.g., Work, Personal, Meeting).",
          "High-speed note filtering using tags and text search."
        ],
        images: ["/images/notes_1.png", "/images/notes_2.png", "/images/notes_3.png"],
        icon: "notes"
      },
      {
        id: "mentions",
        category: "feature",
        title: "🔔 Missed Mentions Hub",
        desc: "A smart inbox centralizing all your unread name mentions (@) and direct messages.",
        bullets: [
          "Provides summarized bullet points of missed chat topics powered by AI.",
          "Reply to teammates and direct messages directly from the sidebar window.",
          "Double-click any mention card to jump to the original chat thread instantly."
        ],
        images: ["/images/mentions_1.png", "/images/mentions_2.png", "/images/mentions_3.png"],
        icon: "mentions"
      },
      {
        id: "search",
        category: "feature",
        title: "🔍 Advanced Conversation Search",
        desc: "Scan historical channel streams with sub-second performance and advanced filters.",
        bullets: [
          "Filter by sender name, specific channels, and date ranges.",
          "View snippets of surrounding conversation context easily.",
          "Fast data loading that bypasses heavy interface loads."
        ],
        images: ["/images/search_1.png", "/images/search_2.png", "/images/search_3.png"],
        icon: "search"
      },
      {
        id: "memes",
        category: "feature",
        title: "🖼️ Meme & Image Repository",
        desc: "Your personal database for charts, templates, reactions, and memes.",
        bullets: [
          "1-click media insertion directly into Mattermost chat inputs.",
          "Search and retrieve animated GIFs using the integrated Giphy API.",
          "Automated compression tools to minimize storage footprint."
        ],
        images: ["/images/meme_1.png", "/images/meme_2.png", "/images/meme_3.png"],
        icon: "memes"
      },
      {
        id: "reactions",
        category: "feature",
        title: "🔥 Quick Reactions & Spammer",
        desc: "Spam emoji reactions, access shortcuts, and leverage hover overlay panels.",
        bullets: [
          "Hover a message to toggle the reactions popover drawer.",
          "Keyboard shortcuts to quickly clear active reactions.",
          "Seamless floating buttons integrated directly next to chat lines."
        ],
        images: ["/images/reactions_1.png", "/images/reactions_2.png", "/images/reactions_3.png"],
        icon: "reactions"
      },
      {
        id: "setup",
        category: "setup",
        title: "⚙️ System Configuration Manual",
        desc: "Customize the extension's behavior and priority settings to fit your workflow.",
        bullets: [
          "Selectively enable or disable any of the 8 floating action buttons.",
          "Setup Giphy API keys to browse quality GIFs.",
          "Prioritize and reorder tabs appearing on the main header.",
          "Manually backup/restore notes and tasks with Google Drive."
        ],
        images: ["/images/settings_1.png", "/images/settings_2.png", "/images/settings_3.png", "/images/settings_4.png"],
        icon: "setup"
      }
    ],

    changelogs: [
      {
        ver: "v3.3.9",
        date: "May 31, 2026",
        latest: true,
        logs: [
          { type: "Highlight", text: "Launched minimalist, presentation slide documentation layout." },
          { type: "UI", text: "Optimized categories, tab layouts, and Giphy API settings config panels on the sidebar." }
        ]
      },
      {
        ver: "v3.3.8",
        date: "May 30, 2026",
        latest: false,
        logs: [
          { type: "Bug", text: "Resolved visibility settings overrides showing disabled tabs on the main menu bar." },
          { type: "UI", text: "Enhanced drag-and-drop tab ordering actions." }
        ]
      },
      {
        ver: "v3.3.0",
        date: "May 27, 2026",
        latest: false,
        logs: [
          { type: "Feature", text: "Released Emoji Reactions Spammer popover and quick tasks/memos modal forms." },
          { type: "Feature", text: "Supported shortcut triggers for fast task creation and reaction options inside Missed Mentions." }
        ]
      },
      {
        ver: "v3.0.0",
        date: "May 26, 2026",
        latest: false,
        logs: [
          { type: "Feature", text: "Integrated Google Drive automatic cloud backup/restore and database cleaners." },
          { type: "Optimize", text: "Introduced client-side image compression engine for gallery uploads." }
        ]
      }
    ]
  }
};

export default function App() {
  const [lang, setLang] = useState('vi');
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeSubImageIndex, setActiveSubImageIndex] = useState(0);
  
  // Image errors fallback
  const [imgErrors, setImgErrors] = useState({});
  
  // Lightbox
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const t = TRANSLATIONS[lang];
  const activeSlide = t.slides[slideIndex];

  const handlePrevSlide = () => {
    setActiveSubImageIndex(0);
    setSlideIndex((prev) => (prev > 0 ? prev - 1 : t.slides.length - 1));
  };

  const handleNextSlide = () => {
    setActiveSubImageIndex(0);
    setSlideIndex((prev) => (prev < t.slides.length - 1 ? prev + 1 : 0));
  };

  const handleImageError = (src) => {
    setImgErrors(prev => ({ ...prev, [src]: true }));
  };

  // Render highly styled inline SVG illustrations as fallbacks for missing images
  const renderFallbackIllustration = (iconName, text) => {
    const iconStyles = "w-16 h-16 mb-4 text-blue-500/80 stroke-[1.5]";
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl h-full w-full select-none">
        {iconName === "tasks" && <CheckSquare className={iconStyles} />}
        {iconName === "notes" && <FileText className={iconStyles} />}
        {iconName === "mentions" && <Bell className={iconStyles} />}
        {iconName === "search" && <Search className={iconStyles} />}
        {iconName === "memes" && <ImageIcon className={iconStyles} />}
        {iconName === "reactions" && <Zap className={iconStyles} />}
        {iconName === "setup" && <Settings className={iconStyles} />}
        
        <span className="text-xs font-bold text-slate-500 text-center px-4 max-w-sm">
          {t.imagePending}
        </span>
        <span className="text-[10px] font-mono text-slate-400 mt-1 max-w-xs truncate">
          {text}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      
      {/* ─── Premium Header ─── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/icon128.png" className="w-8 h-8 rounded-lg object-contain" alt="ChatOps++" />
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">ChatOps++ User Guide</span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600">{t.versionBadge}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-xs font-bold text-slate-700 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.langToggle}</span>
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition text-xs font-bold text-white shadow shadow-blue-600/10 flex items-center gap-1">
              <span>{t.installBtn}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Intro ─── */}
      <section className="pt-16 pb-8 px-6 text-center select-none">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            {t.heroTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            {t.heroSubtitle}
          </p>
        </div>
      </section>

      {/* ─── Main Presentation Slide Card ─── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-6 flex flex-col justify-center">
        
        {/* Slideshow Card container */}
        <div className="bg-white border border-slate-100 rounded-[32px] shadow-[0_24px_70px_rgba(0,0,0,0.03)] p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch min-h-[500px] relative overflow-hidden">
          
          {/* LEFT PANE: Slide Info */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Category tag & Index */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">
                  {activeSlide.category === 'feature' ? t.featureTitle : t.setupTitle}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                  {activeSlide.badge}
                </span>
              </div>

              {/* Title & Desc */}
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {activeSlide.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {activeSlide.desc}
                </p>
              </div>

              {/* Bullet list */}
              <ul className="space-y-3 pt-2">
                {activeSlide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
              <button 
                onClick={handlePrevSlide}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-sm hover:shadow active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              
              {/* Bullet Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {t.slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveSubImageIndex(0);
                      setSlideIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      slideIndex === idx ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <button 
                onClick={handleNextSlide}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-sm hover:shadow active:scale-95"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* RIGHT PANE: Visual Screenshot / Illustration Showcase */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* Visual Frame */}
            <div className="w-full flex-1 aspect-video lg:aspect-auto lg:h-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden relative group shadow-inner min-h-[280px]">
              
              {/* Sub-image tabs selector */}
              {activeSlide.images.length > 1 && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200/80 p-1 rounded-xl shadow-lg">
                  {activeSlide.images.map((_, imgIdx) => (
                    <button
                      key={imgIdx}
                      onClick={() => setActiveSubImageIndex(imgIdx)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                        activeSubImageIndex === imgIdx 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {t.slideProgress} {imgIdx + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Render Image or Fallback SVG */}
              {imgErrors[activeSlide.images[activeSubImageIndex]] ? (
                renderFallbackIllustration(activeSlide.icon, activeSlide.images[activeSubImageIndex].split('/').pop())
              ) : (
                <div 
                  className="w-full h-full cursor-zoom-in"
                  onClick={() => openLightbox(activeSlide.images, activeSubImageIndex)}
                >
                  <img 
                    src={activeSlide.images[activeSubImageIndex]} 
                    alt={`${activeSlide.title} Screen ${activeSubImageIndex + 1}`}
                    onError={() => handleImageError(activeSlide.images[activeSubImageIndex])}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                    <span className="px-4 py-2 bg-slate-900/90 rounded-xl text-xs font-bold text-white border border-slate-800 shadow-xl">
                      Click to Expand
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Pro Tip Note */}
        <div className="mt-6 flex items-start gap-2.5 max-w-lg mx-auto bg-blue-50/50 border border-blue-100/60 p-3.5 rounded-2xl select-none">
          <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed font-semibold">
            <span className="underline">{t.proTip}</span>: {t.proTipDesc}
          </p>
        </div>

      </main>

      {/* ─── Changelog Timeline Section ─── */}
      <section className="py-20 px-6 border-t border-slate-100 max-w-4xl w-full mx-auto">
        <div className="text-center mb-16 select-none">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">{t.changelogTitle}</h2>
          <p className="text-sm text-slate-500 font-medium">{t.changelogSub}</p>
        </div>

        <div className="relative border-l border-slate-100 pl-8 ml-4 space-y-12">
          {t.changelogs.map((changelog, idx) => (
            <div key={idx} className="relative">
              {/* Timeline dot */}
              <div className={`absolute -left-[40px] top-1.5 w-4 h-4 rounded-full border-2 border-white ${
                changelog.latest ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-300'
              }`} />
              
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {changelog.ver}
                    </span>
                    {changelog.latest && (
                      <span className="text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {t.latestBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {changelog.date}
                  </span>
                </div>

                <ul className="space-y-2">
                  {changelog.logs.map((log, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                        log.type === 'Feature' || log.type === 'Tính năng' || log.type === 'Highlight' || log.type === 'Đặc sắc'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : log.type === 'Bug' || log.type === 'Sửa lỗi'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {log.type}
                      </span>
                      <span className="leading-relaxed font-semibold">{log.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-100 bg-white px-6 py-8 mt-auto select-none">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/icons/icon48.png" className="w-6 h-6 object-contain" alt="ChatOps++" />
            <span className="text-xs font-extrabold text-slate-700 tracking-tight">ChatOps++ User Guide</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">
            {t.footerText}
          </p>
        </div>
      </footer>

      {/* ─── Lightbox Modal Viewer ─── */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6 select-none">
          {/* Close button */}
          <button 
            onClick={() => setLightboxImages([])}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Left Navigation */}
          {lightboxImages.length > 1 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
              }}
              className="absolute left-6 w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Screenshot display */}
          <div className="max-w-4xl max-h-[80vh] flex flex-col items-center gap-4">
            <img 
              src={lightboxImages[lightboxIndex]} 
              alt="Enlarged screenshot view" 
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-slate-800 shadow-2xl bg-slate-900"
            />
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {t.lightboxTitle} — {lightboxIndex + 1} / {lightboxImages.length}
            </span>
          </div>

          {/* Right Navigation */}
          {lightboxImages.length > 1 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-6 w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

    </div>
  );
}
