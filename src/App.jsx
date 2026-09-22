import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { categories, filterPosts, formatDate, posts } from "./data.js";
import CoffeeScene from "./animation/CoffeeScene.jsx";

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const listener = () => setHash(window.location.hash);
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return hash;
}

function About({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="about-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="소개 닫기"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="eyebrow">THE PERSON BEHIND THE NOTES</span>
      <Coffee size={42} strokeWidth={1} className="about-coffee" />
      <h2>Hi, I’m Changwoo.</h2>
      <p>
        만드는 일을 좋아하고, 배운 것을 기록합니다.
        <br />
        개발과 디자인 사이에서 조금 더 나은 경험을 고민합니다.
      </p>
      <p>
        memo jung은 그 과정에서 발견한 작은 생각들의 모음입니다. 한 잔의
        커피처럼 편안하게 읽어 주세요.
      </p>
      <span className="signature">Changwoo Jung</span>
      <span className="sample-notice">
        첫 버전 미리보기 · 현재 글은 화면 구성을 위한 샘플입니다.
      </span>
    </dialog>
  );
}

function Article({ post, onBack }) {
  const articleRef = useRef(null);
  useEffect(() => {
    document.title = `${post.title} — memo jung`;
    window.scrollTo({ top: 0, behavior: "instant" });
    articleRef.current.focus({ preventScroll: true });
    return () => {
      document.title = "memo jung — thoughts, freshly brewed.";
    };
  }, [post]);
  return (
    <main className="article-page" ref={articleRef} tabIndex={-1}>
      <button className="text-button back-link" onClick={onBack}>
        <ArrowLeft size={16} /> 모든 기록으로
      </button>
      <div className="post-meta">
        <span className={`category-label ${post.category}`}>
          {categories.find((c) => c.id === post.category).name}
        </span>
        <span>{formatDate(post.date)}</span>
        <span>{post.minutes} min read</span>
      </div>
      <h1>{post.title}</h1>
      <p className="article-deck">{post.excerpt}</p>
      <div className="article-byline">
        <span className="author-avatar">j.</span>
        <div>
          Changwoo Jung<small>생각을 내리고, 기록을 채웁니다.</small>
        </div>
        <Coffee size={24} strokeWidth={1.2} />
      </div>
      <div className="article-body">
        {post.body.map(([type, text], i) =>
          type === "code" ? (
            <pre key={i}>
              <code>{text}</code>
            </pre>
          ) : type === "quote" ? (
            <blockquote key={i}>{text}</blockquote>
          ) : type === "h2" ? (
            <h2 key={i}>{text}</h2>
          ) : (
            <p key={i}>{text}</p>
          ),
        )}
      </div>
      <div className="article-tags">
        {post.tags.map((t) => (
          <span key={t}># {t}</span>
        ))}
      </div>
      <div className="article-end">
        <Coffee size={22} strokeWidth={1.3} />
        <p>여기까지 읽어 주셔서 고맙습니다.</p>
        <button className="text-button" onClick={onBack}>
          다른 기록도 읽어보기 <ArrowRight size={15} />
        </button>
      </div>
    </main>
  );
}

export default function App() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [oldest, setOldest] = useState(false);
  const [limit, setLimit] = useState(5);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState(0);
  const [phase, setPhase] = useState("writing");
  const [sceneStatus, setSceneStatus] = useState("loading");
  const searchRef = useRef(null);
  const hash = useHash();
  const articleId = hash.startsWith("#/note/") ? hash.slice(7) : null;
  const article = posts.find((post) => post.id === articleId);
  const filtered = filterPosts(posts, category, query, oldest);
  const visible = filtered.slice(0, limit);
  const isIntro =
    ["writing", "greeting", "falling", "gathering"].includes(phase) &&
    sceneStatus !== "unavailable";

  const reset = () => {
    window.location.hash = "";
  };
  const chooseCategory = (value) => {
    setCategory(value);
    setLimit(5);
  };
  const beginReplay = () => {
    setPaused(false);
    setReplay((r) => r + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
        !aboutOpen &&
        !article
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [aboutOpen, article]);

  return (
    <div className="site-shell" data-scene={sceneStatus} data-phase={phase}>
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <a
          className="wordmark"
          href="#"
          onClick={reset}
          aria-label="memo jung 홈"
        >
          <span className="brand-symbol">
            <Coffee size={24} strokeWidth={1.5} />
          </span>
          memo<span className="wordmark-jung">jung</span>
          <span className="brand-dot">.</span>
        </a>
        <nav aria-label="주 메뉴">
          <a
            href="#"
            className={!article ? "nav-link active" : "nav-link"}
            onClick={reset}
          >
            Journal
          </a>
          <button className="nav-link" onClick={() => setAboutOpen(true)}>
            About
          </button>
          <span className="nav-divider" />
          <button
            className="icon-button"
            aria-label="글 검색 열기"
            onClick={() => {
              reset();
              setSearchOpen((o) => !o);
            }}
          >
            <Search size={19} strokeWidth={1.6} />
          </button>
        </nav>
      </header>

      {!article && !articleId && (
        <>
          <CoffeeScene
            replay={replay}
            paused={paused || aboutOpen}
            visible={!article}
            onPhase={setPhase}
            onStatus={setSceneStatus}
            layoutKey={`${category}/${query}/${oldest}/${limit}`}
          />
          <main id="main">
            <section
              className={`hero ${isIntro ? "intro-active" : "intro-done"}`}
              aria-label="블로그 소개"
            >
              <div className="hero-topline">
                <span className="eyebrow">
                  <span className="tiny-dot" /> A PERSONAL JOURNAL
                </span>
                <span className="hero-edition">
                  EST. 2026 <span>—</span> SEOUL, KR
                </span>
              </div>
              <div className="hero-copy">
                <div
                  className="greeting-anchor"
                  data-coffee-greeting
                  aria-hidden="true"
                />
                <h1>
                  <span>Thoughts,</span>
                  <span>
                    freshly <em>brewed.</em>
                  </span>
                </h1>
                <span className="sr-only">Hi, I'm Changwoo Jung!</span>
                <p>
                  개발과 디자인, 그리고 일상에서 건져 올린 작은 생각들.
                  <br />
                  커피 한 잔 내리는 마음으로 차곡차곡 기록합니다.
                </p>
              </div>
              <div className="hero-art" data-coffee-pot aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <span className="orbit-star">✳</span>
                <span className="art-caption">
                  a drop of curiosity,
                  <br />
                  <i>a cup of possibility.</i>
                </span>
              </div>
              <div className="hero-bottom">
                <a className="browse-link" href="#journal">
                  Take a sip, stay a while <ArrowDownRight size={17} />
                </a>
                <div className="brew-controls">
                  <span className={`brew-dot ${paused ? "is-paused" : ""}`} />
                  <span className="brew-status">
                    {sceneStatus === "unavailable"
                      ? "A quiet moment"
                      : sceneStatus === "static"
                        ? "A quiet brew"
                        : paused
                          ? "Taking a moment"
                          : isIntro
                            ? "Brewing a little hello"
                            : "Fresh thoughts. Slow coffee."}
                  </span>
                  <button
                    className="icon-button small"
                    aria-label={
                      paused
                        ? "커피 애니메이션 재생"
                        : "커피 애니메이션 일시정지"
                    }
                    onClick={() => setPaused((p) => !p)}
                    disabled={sceneStatus !== "ready"}
                  >
                    {paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  <button
                    className="icon-button small"
                    aria-label="커피 인트로 다시 보기"
                    title="커피 인트로 다시 보기"
                    onClick={beginReplay}
                    disabled={sceneStatus !== "ready"}
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
            </section>

            <section
              className="journal-layout"
              id="journal"
              aria-label="글 목록"
            >
              <aside className="journal-sidebar">
                <div className="sidebar-sticky">
                  <span className="eyebrow sidebar-label">THE NOTEBOOK</span>
                  <h2>
                    A little of
                    <br />
                    <em>everything.</em>
                  </h2>
                  <div className="categories" aria-label="카테고리">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => chooseCategory(c.id)}
                        className={`category-button ${category === c.id ? "selected" : ""}`}
                        aria-pressed={category === c.id}
                      >
                        <span>{c.name}</span>
                        <span className="category-count">
                          {String(
                            c.id === "all"
                              ? posts.length
                              : posts.filter((p) => p.category === c.id).length,
                          ).padStart(2, "0")}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="sidebar-note">
                    <span className="sketch-star">✳</span>
                    <p>
                      배우고, 만들고,
                      <br />
                      가끔은 그냥 생각합니다.
                    </p>
                    <span>One note at a time.</span>
                  </div>
                </div>
              </aside>
              <div className="journal-main">
                <div className="list-toolbar">
                  <div>
                    <h2>
                      {category === "all"
                        ? "Latest notes"
                        : categories.find((c) => c.id === category).name}
                    </h2>
                    <span className="results-count" aria-live="polite">
                      {String(filtered.length).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="list-actions">
                    <button
                      className="icon-button list-search"
                      aria-label="목록 검색"
                      onClick={() => setSearchOpen((o) => !o)}
                    >
                      <Search size={16} />
                    </button>
                    <label className="sort-label">
                      <span className="sr-only">정렬 순서</span>
                      <select
                        value={oldest ? "oldest" : "newest"}
                        onChange={(e) => setOldest(e.target.value === "oldest")}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  </div>
                </div>
                {searchOpen && (
                  <div className="search-field">
                    <Search size={17} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(5);
                      }}
                      placeholder="제목, 내용, 태그로 찾아보세요"
                      aria-label="글 검색"
                    />
                    <button
                      className="icon-button"
                      aria-label="검색 닫기"
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="post-list">
                  {visible.map((post, index) => (
                    <article className="post-row" key={post.id}>
                      <div
                        className="cup-anchor"
                        data-coffee-cup
                        data-index={index}
                        aria-hidden="true"
                      >
                        <span className="cup-fallback" />
                        <span className="cup-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <a href={`#/note/${post.id}`} className="post-link">
                        <div className="post-meta">
                          <span className={`category-label ${post.category}`}>
                            {
                              categories.find((c) => c.id === post.category)
                                .name
                            }
                          </span>
                          <span className="meta-dot">·</span>
                          <time dateTime={post.date}>
                            {formatDate(post.date)}
                          </time>
                          {post.featured && (
                            <span className="fresh-label">
                              <span /> FIRST NOTE
                            </span>
                          )}
                        </div>
                        <h3>
                          {post.title}
                          <ArrowUpRight
                            size={20}
                            strokeWidth={1.3}
                            className="post-arrow"
                          />
                        </h3>
                        <p>{post.excerpt}</p>
                        <div className="post-foot">
                          <div className="tags">
                            {post.tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                          <span className="read-time">
                            {post.minutes} min read
                          </span>
                        </div>
                      </a>
                    </article>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <Coffee size={34} strokeWidth={1} />
                    <h3>아직 이 잔은 비어 있네요.</h3>
                    <p>다른 검색어나 카테고리로 기록을 찾아보세요.</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                    >
                      전체 글 보기 <ArrowRight size={15} />
                    </button>
                  </div>
                )}
                <div className="list-end">
                  {filtered.length > limit ? (
                    <button
                      className="load-more"
                      onClick={() => setLimit((l) => l + 5)}
                    >
                      A few more notes <ArrowDown size={15} />
                    </button>
                  ) : filtered.length > 0 ? (
                    <span className="all-read">
                      <Check size={14} /> You’re all caught up. Time for a
                      refill.
                    </span>
                  ) : null}
                </div>
              </div>
            </section>
          </main>
        </>
      )}
      {article && <Article post={article} onBack={reset} />}
      {articleId && !article && (
        <main className="not-found">
          <h1>이 기록을 찾을 수 없어요.</h1>
          <button className="text-button" onClick={reset}>
            전체 글로 돌아가기 <ArrowRight size={15} />
          </button>
        </main>
      )}
      <footer className="site-footer">
        <div>
          <a href="#" className="footer-brand" onClick={reset}>
            memo jung.
          </a>
          <span>A small corner of the internet, made with care.</span>
        </div>
        <span>© 2026 Changwoo Jung</span>
        <button
          className="text-button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Back to top <ArrowUpRight size={14} />
        </button>
      </footer>
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
