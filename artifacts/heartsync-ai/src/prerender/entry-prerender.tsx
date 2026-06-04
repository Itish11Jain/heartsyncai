/**
 * Build-time prerender entry (SSR).
 *
 * Bundled by vite.config.prerender.ts and imported by
 * scripts/prerender-messages.mjs. Renders each /messages route to a static
 * HTML string using the REAL React page components, so the static HTML and the
 * client app never drift. The client uses createRoot (full re-render), so this
 * markup needs no hydration markers.
 *
 * Only the /messages routes are rendered here — the rest of the SPA stays
 * client-rendered as before.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { Router, Switch, Route } from "wouter";
import MessagesIndex from "@/pages/messages-index";
import MessagesCategory from "@/pages/messages-category";
import MessageGuide from "@/pages/messages-guide";

export { allPrerenderRoutes } from "@/lib/seo-messages";

export function render(url: string): string {
  return renderToStaticMarkup(
    <Router ssrPath={url}>
      <Switch>
        <Route path="/messages">
          <MessagesIndex />
        </Route>
        <Route path="/messages/:occasion/:slug">
          <MessageGuide />
        </Route>
        <Route path="/messages/:occasion">
          <MessagesCategory />
        </Route>
      </Switch>
    </Router>,
  );
}
