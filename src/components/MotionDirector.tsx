import { useEffect } from "react";

type Revertible = { revert: () => void };

export default function MotionDirector() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let disposed = false;
    let motionContext: Revertible | undefined;
    let removePointerMotion: (() => void) | undefined;

    const start = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger")
      ]);

      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ limitCallbacks: true });

      const shell = document.querySelector<HTMLElement>(".observatory-shell");
      if (!shell) return;

      motionContext = gsap.context(() => {
        const boot = gsap.timeline({ defaults: { ease: "power3.out" } });
        boot
          .from(".topbar", { y: -20, autoAlpha: 0, duration: 0.65 })
          .from(".hero-radar", { scale: 0.78, autoAlpha: 0, duration: 1.15 }, 0.08)
          .from(".hero-copy .eyebrow", { x: -18, autoAlpha: 0, duration: 0.55 }, 0.18)
          .from(".hero-copy h1", { y: 48, autoAlpha: 0, clipPath: "inset(0 0 100% 0)", duration: 1.05 }, 0.28)
          .from(".hero-contract", { y: 20, autoAlpha: 0, duration: 0.7 }, 0.66)
          .from(".hero-actions > *", { y: 14, autoAlpha: 0, duration: 0.48, stagger: 0.08 }, 0.8)
          .from(".hero-instrument", { x: 46, rotateY: -7, autoAlpha: 0, duration: 1.05 }, 0.36)
          .from(".instrument-grid > div", { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.08 }, 0.72)
          .from(".proof-spine", { autoAlpha: 0, y: 12, duration: 0.6 }, 1.02)
          .from(".health-rail", { x: 24, autoAlpha: 0, duration: 0.6 }, 1.08);

        document.querySelectorAll<HTMLElement>("[data-count]").forEach((element) => {
          const target = Number(element.dataset.count ?? 0);
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: 1.45,
            delay: 0.72,
            ease: "power2.out",
            onUpdate: () => {
              element.textContent = Math.round(counter.value).toLocaleString();
            }
          });
        });

        const proofSpine = document.querySelector<HTMLElement>(".proof-spine");
        const proofStages = Array.from(document.querySelectorAll<HTMLElement>(".proof-stage"));
        if (proofSpine && proofStages.length > 0) {
          gsap.set(proofStages, { opacity: 0.42, scale: 1 });
          const proofLoop = gsap.timeline({ repeat: -1, repeatDelay: 0.15, delay: 1.65 });
          proofStages.forEach((stage) => {
            proofLoop
              .to(stage, { opacity: 1, scale: 1.045, duration: 0.2, ease: "power2.out" })
              .to(stage, { opacity: 0.54, scale: 1, duration: 0.5, ease: "power1.inOut" }, "+=0.28");
          });
          gsap.fromTo(
            ".proof-packet",
            { x: 0, autoAlpha: 0 },
            {
              x: () => proofSpine.clientWidth * 0.75,
              autoAlpha: 1,
              duration: 4.05,
              ease: "none",
              repeat: -1,
              repeatDelay: 0.15,
              repeatRefresh: true
            }
          );
          gsap.from(".proof-rail-live", { scaleX: 0, transformOrigin: "left center", duration: 1.5, delay: 1.05, ease: "power2.out" });
        }

        gsap.to(".hero-instrument", {
          yPercent: -8,
          rotateX: 1.5,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
            invalidateOnRefresh: true
          }
        });

        gsap.to(".hero-radar", {
          yPercent: 18,
          rotate: 11,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1
          }
        });

        Array.from(document.querySelectorAll<HTMLElement>("main > section:not(.hero)")).forEach((section) => {
          const heading = section.querySelector<HTMLElement>(".section-heading") ?? section;
          gsap.from(heading, {
            y: 34,
            autoAlpha: 0,
            duration: 0.85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 86%",
              toggleActions: "play none none none",
              once: true
            }
          });
        });

        ScrollTrigger.batch(".project-card, .route-card, .live-grid > a", {
          start: "top 92%",
          once: true,
          onEnter: (batch) => gsap.from(batch, {
            y: 28,
            autoAlpha: 0,
            duration: 0.68,
            stagger: 0.075,
            ease: "power2.out",
            overwrite: true
          })
        });
      }, shell);

      const hero = document.querySelector<HTMLElement>(".hero");
      const radar = document.querySelector<HTMLElement>(".hero-radar");
      const instrument = document.querySelector<HTMLElement>(".hero-instrument");
      if (hero && radar && instrument && window.matchMedia("(pointer: fine)").matches) {
        const radarX = gsap.quickTo(radar, "x", { duration: 0.9, ease: "power3.out" });
        const radarY = gsap.quickTo(radar, "y", { duration: 0.9, ease: "power3.out" });
        const instrumentX = gsap.quickTo(instrument, "x", { duration: 0.8, ease: "power3.out" });
        const onPointerMove = (event: PointerEvent) => {
          const bounds = hero.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          radarX(x * 26);
          radarY(y * 18);
          instrumentX(x * 7);
        };
        const onPointerLeave = () => {
          radarX(0);
          radarY(0);
          instrumentX(0);
        };
        hero.addEventListener("pointermove", onPointerMove);
        hero.addEventListener("pointerleave", onPointerLeave);
        removePointerMotion = () => {
          hero.removeEventListener("pointermove", onPointerMove);
          hero.removeEventListener("pointerleave", onPointerLeave);
        };
      }

      window.setTimeout(() => ScrollTrigger.refresh(), 80);
    };

    void start();
    return () => {
      disposed = true;
      removePointerMotion?.();
      motionContext?.revert();
    };
  }, []);

  return null;
}
