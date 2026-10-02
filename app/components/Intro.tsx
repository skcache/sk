import BasketballWord from "./BasketballWord";
import InferenceWord from "./InferenceWord";
import UCSDWord from "./UCSDWord";

export default function Intro() {
  return (
    <p
      className="text-xl leading-[1.92] sm:text-2xl sm:leading-[1.85] [word-spacing:0.14em] sm:[word-spacing:0.1em]"
      lang="en"
    >
      Hey, I&apos;m Siddhant. I&apos;m a 4th year CS student at{" "}
      <UCSDWord />
      .{" "}I&apos;m mostly into{" "}
      <InferenceWord />
      , systems, and building software. Outside of that,{" "}
      <BasketballWord />
      , markets, and design.
    </p>
  );
}