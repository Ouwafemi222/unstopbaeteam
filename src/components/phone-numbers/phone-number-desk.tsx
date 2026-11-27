"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Phone, Search, Signal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Country = { code: string; name: string; online: number };
type TextMessage = { sender: string; message: string; received: string };

const INBOX_CHECK = "0x4AAAAAACgyuLaLScvBJq8u";

function flagIso(code: string) {
  if (code === "uk") return "gb";
  if (code === "sw") return "ch";
  return code.toLowerCase();
}

function Flag({ code, className }: { code: string; className?: string }) {
  const iso = flagIso(code);
  if (!/^[a-z]{2}$/.test(iso)) return null;
  return (
    <img
      src={`https://flagcdn.com/w160/${iso}.png`}
      alt=""
      className={className}
    />
  );
}

function OnlineMark() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
      <Signal className="h-4 w-4" />
      Online
    </span>
  );
}

function pretty(number: string) {
  return `+${number}`;
}

function codeIn(message: string) {
  return message.match(/\b\d{4,8}\b/)?.[0] ?? "";
}

declare global {
  interface Window {
    onInboxCheck?: () => void;
    turnstile?: {
      render: (
        node: HTMLElement,
        options: {
          sitekey: string;
          size: "invisible";
          callback: (token: string) => void;
          "error-callback": () => void;
          "expired-callback": () => void;
        }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

export function PhoneNumberDesk() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryQuery, setCountryQuery] = useState("");
  const [locale, setLocale] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [numberQuery, setNumberQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [copied, setCopied] = useState<"number" | "code" | null>(null);
  const tokenRef = useRef<string | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/phone-numbers")
      .then((response) => response.json())
      .then((body: { countries?: Country[]; error?: string }) => {
        if (cancelled) return;
        if (body.error) toast.error(body.error);
        setCountries(body.countries ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("The number list did not load");
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = document.createElement("div");
    host.style.display = "none";
    document.body.appendChild(host);
    let cancelled = false;
    let localId: string | null = null;

    const render = () => {
      if (cancelled || !window.turnstile || localId) return;
      localId = window.turnstile.render(host, {
        sitekey: INBOX_CHECK,
        size: "invisible",
        callback: (token) => {
          tokenRef.current = token;
        },
        "expired-callback": () => {
          tokenRef.current = null;
          if (localId) window.turnstile?.reset(localId);
        },
        "error-callback": () => {
          tokenRef.current = null;
        },
      });
      widgetId.current = localId;
    };

    if (window.turnstile) render();
    else {
      window.onInboxCheck = () => {
        if (!cancelled) render();
      };
      if (!document.querySelector("script[data-inbox-check]")) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onInboxCheck";
        script.async = true;
        script.dataset.inboxCheck = "1";
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      widgetId.current = null;
      host.remove();
    };
  }, []);

  useEffect(() => {
    if (!locale) return;
    let cancelled = false;
    setLoadingNumbers(true);
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ locale });
      if (numberQuery.trim()) params.set("q", numberQuery.trim());
      fetch(`/api/phone-numbers?${params}`)
        .then((response) => response.json())
        .then((body: { numbers?: string[]; error?: string }) => {
          if (cancelled) return;
          if (body.error) toast.error(body.error);
          setNumbers(body.numbers ?? []);
        })
        .catch(() => {
          if (!cancelled) toast.error("Those numbers did not load");
        })
        .finally(() => {
          if (!cancelled) setLoadingNumbers(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [locale, numberQuery]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    let running = false;

    const freshToken = () =>
      new Promise<string | null>((resolve) => {
        tokenRef.current = null;
        if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        const started = Date.now();
        const timer = window.setInterval(() => {
          if (cancelled || tokenRef.current || Date.now() - started > 8000) {
            window.clearInterval(timer);
            resolve(tokenRef.current);
          }
        }, 200);
      });

    const pull = async () => {
      if (running) return;
      running = true;
      try {
        const token = await freshToken();
        if (cancelled) return;
        const headers: Record<string, string> = {};
        if (token) headers["x-turnstile-token"] = token;
        const body = (await fetch(`/api/phone-numbers/messages?number=${selected}`, {
          headers,
          cache: "no-store",
        }).then((response) => response.json())) as { messages?: TextMessage[]; ok?: boolean };
        if (!cancelled && body.ok) setMessages(body.messages ?? []);
      } catch {
        // Keep the texts already on screen and try again on the next check.
      } finally {
        running = false;
      }
    };

    void pull();
    const timer = window.setInterval(() => void pull(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selected]);

  const visibleCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return countries;
    return countries.filter((country) => country.name.toLowerCase().includes(query));
  }, [countries, countryQuery]);

  const country = countries.find((item) => item.code === locale) ?? null;
  const latestCode = messages.map((item) => codeIn(item.message)).find(Boolean) ?? "";

  async function copy(value: string, kind: "number" | "code") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
          <Phone className="h-6 w-6 text-brand-green" />
          Phone number
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Choose a country, copy a number, and paste it into the Fiverr check. The text arrives on this
          page. These inboxes are shared, so anyone with the number can read the code.
        </p>
      </div>

      {selected && country ? (
        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-brand-green/20 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setMessages([]);
              }}
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-green hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {country.name}
            </button>
            <Flag code={country.code} className="h-14 w-20 rounded-md object-cover shadow-sm" />
            <div className="mt-3">
              <OnlineMark />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Number</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{pretty(selected)}</p>
            <p className="mt-1 text-sm text-neutral-500">{country.name}</p>
            <Button type="button" className="mt-4 w-full" onClick={() => copy(pretty(selected), "number")}>
              <Copy className="h-4 w-4" />
              {copied === "number" ? "Copied" : "Copy number"}
            </Button>
            {latestCode ? (
              <button
                type="button"
                onClick={() => copy(latestCode, "code")}
                className="mt-3 w-full rounded-xl border border-brand-green/20 bg-brand-green-light px-4 py-3 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">Code</p>
                <p className="text-2xl font-bold text-neutral-900">{latestCode}</p>
                <p className="text-xs text-neutral-500">{copied === "code" ? "Copied" : "Tap to copy"}</p>
              </button>
            ) : null}
          </div>
          <div className="rounded-xl border border-brand-green/20 bg-white shadow-sm">
            <div className="border-b border-brand-green/10 px-4 py-3">
              <p className="text-sm font-bold text-neutral-900">Texts</p>
              <p className="text-xs text-neutral-500">This page checks for a new text every few seconds.</p>
            </div>
            {messages.length === 0 ? (
              <p className="px-4 py-10 text-sm text-neutral-500">
                Waiting for a text. Paste the number into Fiverr, then the code shows here.
              </p>
            ) : (
              <ul>
                {messages.map((item, index) => (
                  <li key={`${item.received}-${index}`} className="border-b border-brand-green/10 px-4 py-3 last:border-0">
                    <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
                      <span className="font-semibold text-brand-green">{item.sender || "Text"}</span>
                      <span>{item.received}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : locale && country ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLocale(null);
                setNumbers([]);
                setNumberQuery("");
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-green hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              All countries
            </button>
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <Flag code={country.code} className="h-6 w-9 rounded-sm object-cover shadow-sm" />
              {country.name}
            </h2>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/30">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              value={numberQuery}
              onChange={(event) => setNumberQuery(event.target.value)}
              placeholder="Search the last digits"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          {loadingNumbers ? (
            <p className="text-sm text-neutral-500">Loading numbers…</p>
          ) : numbers.length === 0 ? (
            <p className="text-sm text-neutral-500">No number matches that.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {numbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => {
                    setSelected(number);
                    setMessages([]);
                  }}
                  className="flex min-h-[240px] flex-col rounded-2xl border border-neutral-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-brand-green/40"
                >
                  <span className="flex items-center justify-between">
                    <Phone className="h-5 w-5 text-neutral-400" />
                    <OnlineMark />
                  </span>
                  <Flag
                    code={country.code}
                    className="mx-auto mt-5 h-16 w-24 rounded-md object-cover shadow-sm"
                  />
                  <span className="mt-5 text-center text-xl font-bold tracking-tight text-neutral-900">
                    {pretty(number)}
                  </span>
                  <span className="mt-1 text-center text-sm text-neutral-500">{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/30">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              value={countryQuery}
              onChange={(event) => setCountryQuery(event.target.value)}
              placeholder="Search a country"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          {loadingCountries ? (
            <p className="text-sm text-neutral-500">Loading countries…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCountries.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLocale(item.code)}
                  className="flex min-h-[112px] items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-5 text-left shadow-sm transition hover:border-brand-green/40"
                >
                  <Flag code={item.code} className="h-12 w-16 shrink-0 rounded-md object-cover shadow-sm" />
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold text-neutral-900">{item.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <OnlineMark />
                      <span className="text-sm text-neutral-500">{item.online.toLocaleString()} numbers</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
