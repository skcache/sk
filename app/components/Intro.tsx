import BasketballWord from "./BasketballWord";
import InferenceWord from "./InferenceWord";
import UCSDWord from "./UCSDWord";

export default function Intro() {
  return (
    <p className="text-lg leading-[1.75] sm:text-xl" lang="en">
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