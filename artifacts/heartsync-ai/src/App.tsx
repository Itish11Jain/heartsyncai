import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Preview from "@/pages/preview";
import Generate from "@/pages/generate";
import Report from "@/pages/report";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import History from "@/pages/history";
import Moments from "@/pages/moments";
import DateGuide from "@/pages/date-guide";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/date-guide" component={DateGuide} />
      <Route path="/preview" component={Preview} />
      <Route path="/generate" component={Generate} />
      <Route path="/report" component={Report} />
      <Route path="/contact" component={Contact} />
      <Route path="/terms" component={Terms} />
      <Route path="/history" component={History} />
      <Route path="/moments" component={Moments} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
