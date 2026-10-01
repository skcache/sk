import Intro from "./components/Intro";
import OrviaWord from "./components/OrviaWord";
import GoogleDevGroupWord from "./components/GoogleDevGroupWord";
import KeywordsWord from "./components/KeywordsWord";
import PageReveal from "./components/PageReveal";
import IntroAutoplay from "./components/IntroAutoplay";
import { ExternalLink } from "lucide-react";

const socials = [
  { label: "GitHub", href: "https://github.com/skcache" },
  { label: "X", href: "https://x.com/skcache" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/skuwar" },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

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

      <header
        data-reveal
        className="mx-auto flex w-full max-w-[42rem] items-center justify-between px-5 py-8 sm:px-6"
      >
        <span className="text-[17px] font-medium tracking-tight">
          Siddhant Kuwar
        </span>
        <nav aria-label="Profile links" className="flex items-center gap-6 sm:gap-7">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              title={social.label}
              className="tactile text-muted transition-colors hover:text-ink"
            >
              {social.label === "GitHub" ? (
                <GitHubIcon />
              ) : social.label === "X" ? (
                <XIcon />
              ) : (
                <LinkedInIcon />
              )}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[42rem] px-5 sm:px-6">
        <PageReveal />
        <section
          id="intro"
          data-reveal
          aria-label="Intro"
          className="pt-14 pb-32 sm:pt-16 sm:pb-36"
        >
          <Intro />
          <IntroAutoplay />
        </section>

        <section data-reveal aria-labelledby="things-done" className="pb-24 sm:pb-28">
          <h2
            id="things-done"
            className="border-t border-hairline pt-12 text-base font-medium sm:pt-14"
          >
            some things i&apos;ve done
          </h2>
          <ul className="mt-8 space-y-6">
            <li className="flex gap-3 text-lg leading-[1.6]">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>
                Building{" "}
                <OrviaWord />
              </span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.6]">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>
                President at{" "}
                <GoogleDevGroupWord />
                , UC San Diego
              </span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.6]">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>Undergraduate Research Assistant at Chiba Lab</span>
            </li>
            <li className="flex gap-3 text-lg leading-[1.6]">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>
                AI Research Intern at{" "}
                <KeywordsWord />
              </span>
            </li>
          </ul>
        </section>

        <section data-reveal aria-labelledby="things-built" className="pb-20 sm:pb-24">
          <h2
            id="things-built"
            className="border-t border-hairline pt-12 text-base font-medium sm:pt-14"
          >
            things i&apos;ve built
          </h2>
          {/* whitespace index: no row cages, one quiet section rule only */}
          <ul className="mt-3 space-y-1">
            {projects.map((project) => (
              <li
                key={project.name}
                className="group flex items-center justify-between gap-4 py-2"
              >
                <span className="text-base transition-transform duration-200 ease-out group-hover:translate-x-[2px]">
                  {project.name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      className="tactile grid size-10 flex-none place-items-center rounded-md text-muted hover:bg-ink/[0.05] hover:text-ink"
                    >
                      {link.kind === "github" ? (
                        <GitHubIcon />
                      ) : (
                        <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                      )}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer
        data-reveal
        className="mx-auto w-full max-w-[42rem] px-5 pb-16 sm:px-6"
      >
        <p className="text-[15px] text-muted">© {year} Siddhant Kuwar</p>
      </footer>
    </>
  );
}