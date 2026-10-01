const links = [
  { label: "GitHub", href: "https://github.com/skcache" },
  { label: "X", href: "https://x.com/skcache" },
  // TODO: drop a resume at public/resume.pdf once available
  { label: "Resume", href: "/resume.pdf" },
];

const projects = [
  {
    name: "MiniServe",
    description: "Inference engine built from scratch.",
    stack: "C++ · Metal · inference",
    href: "https://github.com/skcache/miniserve",
  },
  {
    name: "Orvia",
    description: "Operations software for distributors.",
    stack: "Next.js · Postgres · AI",
    href: "https://orviaops.com",
  },
  {
    name: "Cacheyard",
    description: "In-memory cache server.",
    stack: "C++ · TCP · caching",
    href: "https://github.com/skcache/cacheyard",
  },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-[60rem] items-center justify-between px-6 py-5">
          <span className="text-[15px] font-medium tracking-tight">
            Siddhant Kuwar
          </span>
          <nav aria-label="Profile links" className="flex items-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="link-underline text-sm text-muted transition-colors hover:text-foreground"
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto w-full max-w-[60rem] px-6 pb-28 pt-24">
          <p className="text-sm text-muted">CS @ UC San Diego.</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl">
            I like building AI systems, software,
            <br />
            and things that are <span className="text-accent">fast.</span>
          </h1>
        </section>

        <section
          aria-labelledby="work"
          className="mx-auto w-full max-w-[60rem] px-6 pb-28"
        >
          <h2
            id="work"
            className="text-xs font-medium uppercase tracking-[0.16em] text-muted"
          >
            Selected work
          </h2>
          <ul className="mt-6 border-t border-hairline">
            {projects.map((project) => (
              <li key={project.name} className="border-b border-hairline">
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-row group flex items-baseline justify-between gap-6 py-7 sm:py-8"
                >
                  <div className="min-w-0">
                    <h3 className="link-underline text-xl font-semibold tracking-tight">
                      {project.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted">
                      {project.description}
                    </p>
                    <p className="mt-2.5 font-mono text-xs text-muted">
                      {project.stack}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-foreground/50 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-accent"
                  >
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto w-full max-w-[60rem] px-6 py-8">
          <p className="text-xs text-muted">© {year} Siddhant Kuwar</p>
        </div>
      </footer>
    </>
  );
}