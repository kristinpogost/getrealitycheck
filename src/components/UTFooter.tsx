import utLogo from "@/assets/ut-logo.svg";

export function UTFooter() {
  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-40 sm:bottom-4 sm:right-4"
      aria-hidden="true"
    >
      <img
        src={utLogo}
        alt=""
        className="h-10 w-auto opacity-70"
        loading="lazy"
      />
    </div>
  );
}
