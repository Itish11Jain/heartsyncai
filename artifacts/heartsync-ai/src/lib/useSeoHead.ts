import { useEffect } from "react";

/**
 * Client-side <head> manager for SEO pages.
 *
 * The /messages routes are pre-rendered to static HTML at build time (real
 * title/meta/canonical baked in), but when a user navigates client-side via
 * the SPA router the document head doesn't update on its own. This hook keeps
 * title, description, canonical and social tags correct on the client too.
 *
 * SSR-safe: all DOM work happens inside useEffect, which never runs on the
 * server during prerender.
 */
export interface SeoHead {
  title: string;
  description: string;
  canonical: string;
  /** Optional JSON-LD structured data object. */
  jsonLd?: Record<string, unknown>;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSON_LD_ID = "hs-seo-jsonld";

export function useSeoHead({ title, description, canonical, jsonLd }: SeoHead) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertCanonical(canonical);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);

    let script = document.getElementById(
      JSON_LD_ID,
    ) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.id = JSON_LD_ID;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      const s = document.getElementById(JSON_LD_ID);
      if (s) s.remove();
    };
  }, [title, description, canonical, jsonLd]);
}
