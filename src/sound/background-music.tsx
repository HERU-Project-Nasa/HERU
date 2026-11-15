"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const MUSIC_URL = "/sound/background-sound.mp3";
const PREFERENCE_KEY = "heru:music";

/*
 * A música foi masterizada alta (cerca de -21 dBFS de média). Com ganho 0,28
 * ela fica perto de -32 dBFS: presente, mas abaixo de qualquer outro som e
 * confortável para ficar tocando enquanto a pessoa lê.
 */
const MUSIC_VOLUME = 0.28;
const FADE_IN_SECONDS = 2.5;
const FADE_OUT_SECONDS = 0.6;
const START_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;
const BAR_DELAYS = ["0ms", "180ms", "360ms", "90ms"];

type Engine = { context: AudioContext; gain: GainNode };

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

const preferenceListeners = new Set<() => void>();
let sessionPreference: boolean | null = null;

function currentPreference(): boolean {
  return sessionPreference ?? readPreference();
}

function subscribePreference(listener: () => void) {
  preferenceListeners.add(listener);
  return () => {
    preferenceListeners.delete(listener);
  };
}

function savePreference(enabled: boolean) {
  sessionPreference = enabled;
  try {
    window.localStorage.setItem(PREFERENCE_KEY, enabled ? "on" : "off");
  } catch {
    // Sem armazenamento disponível: a escolha vale só nesta visita.
  }
  for (const listener of preferenceListeners) {
    listener();
  }
}

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const pauseTimerRef = useRef(0);
  const enabled = useSyncExternalStore(
    subscribePreference,
    currentPreference,
    () => true,
  );
  const [playing, setPlaying] = useState(false);

  const engine = (): Engine => {
    if (!engineRef.current) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      context
        .createMediaElementSource(audioRef.current!)
        .connect(gain)
        .connect(context.destination);
      engineRef.current = { context, gain };
    }
    return engineRef.current;
  };

  const fadeTo = (volume: number, seconds: number) => {
    const { context, gain } = engine();
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(volume, now + seconds);
  };

  const start = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    window.clearTimeout(pauseTimerRef.current);
    try {
      const { context } = engine();
      await context.resume();
      await audio.play();
      fadeTo(MUSIC_VOLUME, FADE_IN_SECONDS);
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio || !engineRef.current) {
      audio?.pause();
      setPlaying(false);
      return;
    }
    fadeTo(0, FADE_OUT_SECONDS);
    window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(
      () => audio.pause(),
      FADE_OUT_SECONDS * 1000,
    );
    setPlaying(false);
  };

  const startRef = useRef(start);
  const stopRef = useRef(stop);
  useEffect(() => {
    startRef.current = start;
    stopRef.current = stop;
  });

  useEffect(() => {
    if (!currentPreference()) {
      return;
    }
    const onFirstInteraction = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-music-toggle]")) {
        return;
      }
      for (const name of START_EVENTS) {
        window.removeEventListener(name, onFirstInteraction);
      }
      startRef.current();
    };
    for (const name of START_EVENTS) {
      window.addEventListener(name, onFirstInteraction, { passive: true });
    }
    return () => {
      for (const name of START_EVENTS) {
        window.removeEventListener(name, onFirstInteraction);
      }
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio || !engineRef.current) {
        return;
      }
      if (document.hidden) {
        audio.pause();
      } else if (enabled && playing) {
        audio.play().catch(() => setPlaying(false));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled, playing]);

  useEffect(
    () => () => {
      window.clearTimeout(pauseTimerRef.current);
      engineRef.current?.context.close();
    },
    [],
  );

  const toggle = () => {
    const next = !enabled;
    savePreference(next);
    if (next) {
      startRef.current();
    } else {
      stopRef.current();
    }
  };

  const label = enabled ? "Desligar música de fundo" : "Ligar música de fundo";

  return (
    <>
      <audio ref={audioRef} src={MUSIC_URL} loop preload="none" />
      <button
        type="button"
        data-music-toggle
        aria-pressed={enabled}
        aria-label={label}
        title={
          enabled && !playing
            ? "A música começa quando você interage com a página"
            : label
        }
        onClick={toggle}
        className="group relative flex size-11 cursor-pointer items-center justify-center rounded-full border border-transparent text-ink transition-colors duration-200 ease-standard hover:border-line-strong hover:bg-surface-hover"
      >
        <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
          {BAR_DELAYS.map((delay, index) => (
            <span
              key={delay}
              className={`w-[3px] origin-bottom rounded-full transition-[height,background-color] duration-300 ease-standard ${enabled ? "bg-ink" : "bg-ink-disabled"} ${enabled && playing ? "h-4 motion-safe:animate-music-bar" : index % 2 === 0 ? "h-1.5" : "h-2.5"}`}
              style={{ animationDelay: delay }}
            />
          ))}
        </span>
        {!enabled && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-5 w-px rotate-45 bg-ink-muted"
          />
        )}
      </button>
    </>
  );
}
