// scripts/tmp-fix-left-sidebar.mjs
import { readFileSync, writeFileSync } from "node:fs";

const path = "c:/boutiquecogi3/components/toggle/left-sidebar.tsx";
let src = readFileSync(path, "utf8");

// Import already replaced to NewsletterForm in a prior step.
if (!src.includes('import { NewsletterForm } from "@/components/newsletter/newsletter-form.client";')) {
  console.error("NEWSLETTER_FORM_IMPORT_NOT_FOUND");
  process.exit(1);
}

// Replace the <Newsletter .../> usage (multi-line) with NewsletterForm wrapped
// in a titled section.
const usageRe = /<Newsletter\b[\s\S]*?\/>/;
if (!usageRe.test(src)) {
  console.error("USAGE_NOT_FOUND");
  process.exit(1);
}
const replacement = `<section aria-labelledby="left-sidebar-newsletter-title" className="space-y-4">
            <h2 id="left-sidebar-newsletter-title" className="text-lg font-semibold">
              Newsletter Boutiquecogi3
            </h2>
            <p className="text-sm text-muted-foreground">
              Inscrivez-vous pour recevoir nos promotions et actualit\u00e9s.
            </p>
            <NewsletterForm
              onSubscribe={onSubscribe}
              submitLabel="S'inscrire"
              onSuccess={() => toast.success("Inscription \u00e0 la Newsletter r\u00e9ussie !")}
              onError={(_email: string, message: string) => toast.error(message)}
            />
          </section>`;
src = src.replace(usageRe, replacement);

writeFileSync(path, src, "utf8");
console.log("OK: left-sidebar.tsx patched");

