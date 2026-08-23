
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Link } from "react-router";
import { ArrowRight, Play } from "lucide-react";
import { HERO_SLIDES } from "@/content/site";
import { ButtonLink } from "@/components/ui";

/** How long each slide stays on screen. */
const INTERVAL_MS = 6000;

/**
 * Auto-rotating hero banner.
 *
 * Slides cross-fade rather than slide horizontally: with full-bleed background
 * images a fade reads as intentional at any aspect ratio, while a horizontal
 * track needs careful width math to avoid a visible seam on ultrawide screens.
 *
 * All slides stay mounted and are toggled with opacity so the browser keeps the
 * decoded images around — re-mounting caused a visible flash on each rotation.
 */
export function HeroCarousel({ children }: { children?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Set once on mount so the interval is skipped for users who asked for less
  // motion. globals.css already neutralises transitions; this stops the
  // rotation itself, which no CSS media query can do.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback((next: number) => {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || HERO_SLIDES.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion]);

  // Touch swipe. Tracked in a ref so a horizontal drag does not re-render on
  // every move event.
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    touchX.current = null;
  }

  return (
    <section
      className="relative isolate flex min-h-[88vh] items-center overflow-hidden pt-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Banner utama KPMI"
    >
      {/* ------------------------------------------------ Slide backgrounds */}
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className="absolute inset-0 -z-10 transition-opacity duration-1000 ease-out motion-reduce:transition-none"
          style={{
            opacity: i === index ? 1 : 0,
            background: slide.image ? undefined : slide.gradient,
          }}
          aria-hidden={i !== index}
        >
          {slide.image && (
            <Image
              src={slide.image}
              alt=""
              fill
              // The hero is the largest paint on the page, so the first slide
              // is eager to keep LCP down; the rest can wait.
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          )}
          {/* Scrim: photos vary wildly in brightness, and white text has to stay
              readable over all of them. */}
          <div className="absolute inset-0 bg-gradient-to-br from-maroon-950/85 via-maroon-900/70 to-maroon-800/60" />
        </div>
      ))}

      <div className="pattern-geo absolute inset-0 -z-10" />

      {/* ------------------------------------------------------- Slide copy */}
      <div className="shell relative pb-28">
        <div className="mx-auto max-w-3xl text-center">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={slide.title}
              className={
                i === index
                  ? "transition-opacity duration-700"
                  : "pointer-events-none absolute inset-0 opacity-0"
              }
              aria-hidden={i !== index}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-gold-300 backdrop-blur">
                <span className="text-gold-400">★</span>
                {slide.badge}
              </div>

              <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-balance text-white/80">
                {slide.subtitle}
              </p>

              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <ButtonLink href={slide.primary.href} variant="gold" size="lg">
                  {slide.primary.label} <ArrowRight size={18} />
                </ButtonLink>
                <Link
                  to={slide.secondary.href}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/25 bg-black/20 px-8 py-3.5 font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  <Play size={16} />
                  {slide.secondary.label}
                </Link>
              </div>
            </div>
          ))}

          {/* --------------------------------------------- Dot indicators */}
          {HERO_SLIDES.length > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              {HERO_SLIDES.map((slide, i) => (
                <button
                  key={slide.title}
                  onClick={() => go(i)}
                  aria-label={`Tampilkan banner ${i + 1}: ${slide.title}`}
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-8 bg-gold-400"
                      : "w-4 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {children}
      </div>

      {/* ------------------------------------------------ Curved wave edge */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        // Height is fixed while the viewBox stretches, so the wave keeps a
        // consistent depth instead of growing on ultrawide screens.
        style={{ height: "clamp(60px, 8vw, 120px)" }}
      >
        <path
          fill="#ffffff"
          d="M0,64 C240,120 480,16 720,40 C960,64 1200,120 1440,72 L1440,120 L0,120 Z"
        />
      </svg>
    </section>
  );
}
