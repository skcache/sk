"use client";

import { useState } from "react";

type Word = "ucsd" | "inference" | "basketball" | "markets" | "design";

export default function Intro() {
  const [active, setActive] = useState<{ word: Word; run: number } | null>(null);
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const trigger = (word: Word) => {
    setActive({ word, run: (active?.run ?? 0) + 1 });
  };

  const clear = () => setActive(null);

  const is = (word: Word) => active?.word === word;
  const animClass = (word: Word) =>
    is(word) && !reduced && (word === "ucsd" || word === "inference")
      ? `word-${word}-anim`
      : "";

  return (
    <p className="text-lg leading-[1.75] sm:text-xl" lang="en">
      Hey, I&apos;m Siddhant. I&apos;m a fourth-year CS student at{" "}
      <button
        type="button"
        onClick={() => trigger("ucsd")}
        onAnimationEnd={clear}
        className={`word-button whitespace-nowrap ${animClass("ucsd")} ${
          is("ucsd") && reduced ? "word-fallback" : ""
        }`}
      >
        UC San Diego
        {is("ucsd") && !reduced && (
          <span key={active?.run ?? 0} aria-hidden="true">
            <svg
              className="word-decoration word-trident -top-6 left-0 h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 21V12M5.5 12h13M7.5 12V6.5M12 12V4.5M16.5 12V6.5"
                stroke="#182b49"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </button>
      .{" "}I&apos;m mostly into{" "}
      <button
        type="button"
        onClick={() => trigger("inference")}
        onAnimationEnd={clear}
        className={`word-button overflow-hidden ${animClass("inference")} ${
          is("inference") && reduced ? "word-fallback" : ""
        }`}
      >
        inference
        {is("inference") && !reduced && (
          <span
            key={active?.run ?? 0}
            aria-hidden="true"
            className="word-shimmer-bar"
          />
        )}
      </button>
      , systems, and building software. Outside of that,{" "}
      <button
        type="button"
        onClick={() => trigger("basketball")}
        onAnimationEnd={clear}
        className={`word-button ${animClass("basketball")} ${
          is("basketball") && reduced ? "word-fallback" : ""
        }`}
      >
        basketball
        {is("basketball") && !reduced && (
          <span
            key={active?.run ?? 0}
            aria-hidden="true"
            className="word-decoration word-ball -bottom-2 -left-1"
          />
        )}
      </button>
      ,{" "}
      <button
        type="button"
        onClick={() => trigger("markets")}
        onAnimationEnd={clear}
        className={`word-button ${animClass("markets")} ${
          is("markets") && reduced ? "word-fallback" : ""
        }`}
      >
        markets
        {is("markets") && !reduced && (
          <svg
            key={active?.run ?? 0}
            aria-hidden="true"
            className="word-decoration word-sparkline -bottom-4 left-0 h-4 w-16"
            viewBox="0 0 56 16"
            fill="none"
          >
            <path
              d="M1 12.5 9 10.4l6 1.1 8-5 8 2 8-5.4 8 3.4 8-4.6"
              stroke="#4a7c61"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="64"
            />
          </svg>
        )}
      </button>,{" "}
      and{" "}
      <button
        type="button"
        onClick={() => trigger("design")}
        onAnimationEnd={clear}
        className={`word-button ${animClass("design")} ${
          is("design") && reduced ? "word-fallback" : ""
        }`}
      >
        design
        {is("design") && !reduced && (
          <span key={active?.run ?? 0} aria-hidden="true">
            <span className="word-decoration word-design-box">
              <span className="word-design-tick -left-0.5 -top-0.5" />
              <span className="word-design-tick -right-0.5 -top-0.5" />
              <span className="word-design-tick -bottom-0.5 -left-0.5" />
              <span className="word-design-tick -bottom-0.5 -right-0.5" />
            </span>
          </span>
        )}
      </button>
      .
    </p>
  );
}