import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, Loader2, Sparkles } from "lucide-react";

import { useGenerateReport } from "@workspace/api-client-react";
import { reportStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  partnerName: z.string().min(1, "Name toh batao bhai!"),
  occasion: z.string().min(1, "Select an occasion"),
  knownDetails: z.string().optional(),
  vibe: z.string().optional(),
});

const LOADING_MESSAGES = [
  "Analyzing aura...",
  "Checking vibe meter...",
  "Mumbai intel gathering...",
  "Report banao ho rahi hai...",
  "Adding some Bandra flair...",
];

export default function Generate() {
  const [, setLocation] = useLocation();
  const generateReport = useGenerateReport();
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partnerName: "",
      occasion: "",
      knownDetails: "",
      vibe: "",
    },
  });

  useEffect(() => {
    if (!generateReport.isPending) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [generateReport.isPending]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    generateReport.mutate({ data: values }, {
      onSuccess: (data) => {
        reportStore.set(data);
        setLocation("/report");
      }
    });
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Button asChild variant="ghost" className="mb-8 pl-0 text-white/60 hover:text-white hover:bg-transparent">
          <Link href="/" className="flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" /> Back
          </Link>
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-2 text-white">Set the Scene</h1>
          <p className="text-white/60 mb-8">Give us the details, we'll give you the ultimate strategy.</p>

          <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="partnerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Who are we meeting?</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter their name" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occasion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">What's the occasion?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                            <SelectValue placeholder="Select location/vibe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="Coffee date">Coffee date</SelectItem>
                          <SelectItem value="Dinner">Dinner</SelectItem>
                          <SelectItem value="Movie">Movie</SelectItem>
                          <SelectItem value="Road trip">Road trip</SelectItem>
                          <SelectItem value="House party">House party</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="knownDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Any intel? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Unhe coffee pasand hai, engineering mein hai, dog lover..." 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[100px] rounded-xl" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vibe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">What's your goal?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                            <SelectValue placeholder="Select desired vibe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-white/10 text-white">
                          <SelectItem value="Chill vibes">Chill vibes</SelectItem>
                          <SelectItem value="Impress karna hai">Impress karna hai</SelectItem>
                          <SelectItem value="Funny rehna chahta hoon">Funny rehna chahta hoon</SelectItem>
                          <SelectItem value="Serious connection">Serious connection</SelectItem>
                          <SelectItem value="Just wing it">Just wing it</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={generateReport.isPending}
                    className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all overflow-hidden relative"
                  >
                    <AnimatePresence mode="wait">
                      {generateReport.isPending ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="flex items-center gap-3"
                        >
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="w-5 h-5" /> Generate My Report
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
