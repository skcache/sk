import BasketballWord from "./BasketballWord";
import InferenceWord from "./InferenceWord";
import UCSDWord from "./UCSDWord";

export default function Intro() {
  return (
    <p
      className="text-lg leading-[1.9] sm:text-xl sm:leading-[1.8] [word-spacing:0.16em] sm:[word-spacing:0.1em]"
      lang="en"
    >
      Hey, I&apos;m Siddhant. I&apos;m a fourth-year CS student at{" "}
      <UCSDWord />
      .{" "}I&apos;m mostly into{" "}
      <InferenceWord />
      , systems, and building software. Outside of that,{" "}
      <BasketballWord />
      , markets, and design.
    </p>
  );
}