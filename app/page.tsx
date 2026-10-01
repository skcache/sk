import Intro from "./components/Intro";
import OrviaWord from "./components/OrviaWord";
import GoogleDevGroupWord from "./components/GoogleDevGroupWord";
import KeywordsWord from "./components/KeywordsWord";
import PageReveal from "./components/PageReveal";
import IntroAutoplay from "./components/IntroAutoplay";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

const socials = [
  { label: "GitHub", href: "https://github.com/skcache" },
  { label: "X", href: "https://x.com/skcache" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/skuwar" },
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
            className="border-t border-hairline pt-12 text-[15px] font-medium sm:pt-14"
          >
            some things i&apos;ve done
          </h2>
          <ul className="mt-8 space-y-6">
            <li className="flex gap-3 text-base leading-snug">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>
                building{" "}
                <OrviaWord />
              </span>
            </li>
            <li className="flex gap-3 text-base leading-snug">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>
                President at{" "}
                <GoogleDevGroupWord />
                , UC San Diego
              </span>
            </li>
            <li className="flex gap-3 text-base leading-snug">
              <span aria-hidden="true" className="select-none text-muted">
                •
              </span>
              <span>CV undergrad RA at HECD Lab</span>
            </li>
            <li className="flex gap-3 text-base leading-snug">
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
            className="border-t border-hairline pt-12 text-[15px] font-medium sm:pt-14"
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
                <span className="text-[15px] transition-transform duration-200 ease-out group-hover:translate-x-[2px]">
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
                        <Image
                          src="/github-mark.png"
                          alt=""
                          width={560}
                          height={560}
                          className="h-[15px] w-[15px] opacity-80"
                        />
                      ) : (
                        <ExternalLink className="h-[15px] w-[15px]" strokeWidth={1.8} />
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
        <p className="text-sm text-muted">© {year} Siddhant Kuwar</p>
      </footer>
    </>
  );
}