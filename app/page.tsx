import Intro from "./components/Intro";

const socials = [
  { label: "GitHub", href: "https://github.com/skcache" },
  { label: "X", href: "https://x.com/skcache" },
];

const things = [
  "President, GDG UC San Diego",
  "Undergraduate research, Chiba Lab, UC San Diego",
  "Keywords Studios",
  "Oracle REACH",
  "Palantir Winter Tech Fellowship",
];

type ProjectLink = {
  kind: "github" | "external";
  href: string;
  label: string;
};

const projects: { name: string; links: ProjectLink[] }[] = [
  {
    name: "MiniServe",
    links: [
      {
        kind: "github",
        href: "https://github.com/skcache/miniserve",
        label: "MiniServe on GitHub",
      },
    ],
  },
  {
    name: "Orvia",
    links: [
      // repo is private; the product URL is the public home
      {
        kind: "external",
        href: "https://orviaops.com",
        label: "Orvia website",
      },
    ],
  },
  {
    name: "Cacheyard",
    links: [
      {
        kind: "github",
        href: "https://github.com/skcache/cacheyard",
        label: "Cacheyard on GitHub",
      },
    ],
  },
  {
    name: "Jev Traffic Sim",
    links: [
      {
        kind: "github",
        href: "https://github.com/skcache/jevtrafficsim",
        label: "Jev Traffic Sim on GitHub",
      },
      {
        kind: "external",
        href: "https://jevtrafficsim.vercel.app",
        label: "Jev Traffic Sim website",
      },
    ],
  },
  {
    name: "Plywise",
    links: [
      {
        kind: "github",
        href: "https://github.com/skcache/plywise",
        label: "Plywise on GitHub",
      },
      {
        kind: "external",
        href: "https://plywise-chess.vercel.app",
        label: "Plywise website",
      },
    ],
  },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <>
      <a
        href="#intro"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <header className="mx-auto flex w-full max-w-[44rem] items-center justify-between px-5 py-7 sm:px-6">
        <span className="text-[15px] font-medium tracking-tight">
          Siddhant Kuwar
        </span>
        <nav aria-label="Profile links" className="flex items-center gap-5 sm:gap-6">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="tactile link-underline text-sm text-muted transition-colors hover:text-ink"
            >
              {social.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[44rem] px-5 sm:px-6">
        <section id="intro" aria-label="Intro" className="pt-10 pb-24 sm:pt-14 sm:pb-28">
          <Intro />
        </section>

        <section aria-labelledby="things-done" className="pb-20 sm:pb-24">
          <h2
            id="things-done"
            className="border-t border-hairline pt-9 text-[15px] font-medium"
          >
            some things i&apos;ve done
          </h2>
          <ul className="mt-6 space-y-4">
            {things.map((thing) => (
              <li key={thing} className="flex gap-3 text-base leading-snug">
                <span aria-hidden="true" className="select-none text-muted">
                  •
                </span>
                <span>{thing}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="things-built" className="pb-16 sm:pb-20">
          <h2
            id="things-built"
            className="border-t border-hairline pt-9 text-[15px] font-medium"
          >
            things i&apos;ve built
          </h2>
          <ul className="mt-6 border-t border-hairline">
            {projects.map((project) => (
              <li
                key={project.name}
                className="group flex items-center justify-between gap-4 border-b border-hairline py-3.5 transition-colors duration-200 hover:border-ink/20"
              >
                <span className="text-[15px] transition-transform duration-200 ease-out group-hover:translate-x-[2px]">{project.name}</span>
                <span className="flex items-center gap-1">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      className="tactile grid size-10 place-items-center rounded-md text-muted hover:bg-ink/[0.05] hover:text-ink"
                    >
                      {link.kind === "github" ? <GitHubIcon /> : <ExternalIcon />}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[44rem] px-5 pb-10 sm:px-6">
        <p className="text-sm text-muted">© {year} Siddhant Kuwar</p>
      </footer>
    </>
  );
}