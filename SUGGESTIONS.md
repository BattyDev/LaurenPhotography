# Suggestions for Cody

## Make the pitch easy to follow

- Start with two tabs on one laptop. Let Lauren pick a holiday, change one price, and watch the client page update. Then hand her the phone for a separate demonstration of the same controls. Browser storage belongs to one device and profile.
- Walk one sample family from inquiry through signature. Save the outbox, drag-to-reorder, and scheduling conflicts for questions. A five-minute pitch can show the full client journey without touring every setting.
- Ask Lauren which details she needs before quoting a session, which packages can take a deposit immediately, and whether she wants inquiries for individual add-ons. Those answers should shape the booking form.
- Consider adding a single guided reset-and-rehearse sequence and a list of recently edited packages if Lauren expects to make frequent changes from her phone.

## Moving to a real studio

1. **Hosting.** Cloudflare Pages is a reasonable home for the static public portfolio. Keep the existing HTML while moving writes and privileged operations behind authenticated functions. Agree on the business domain and who owns its DNS before launch. [Cloudflare Pages](https://pages.cloudflare.com/)
2. **Identity and records.** Use Supabase Auth for Lauren and Postgres for clients, inquiries, versioned package prices, contracts, and activity. Use row-level policies, server-side authorization, and separate public reads from private client records. Set retention periods, back up the database, and test restoration. Store originals privately, publish optimized portfolio copies with permission, and provide expiring access to private galleries. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
3. **Email.** Send through Resend from a verified studio domain. Keep credentials in server-side secrets. Give each send a durable ID, record retries and bounces, and show delivery status. Mark an agreement viewed when the signing page opens. [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction)
4. **Agreements.** Have qualified counsel prepare terms for the studio and its location. Choose an e-signature provider with signer verification, a timestamped audit trail, and an exportable signed document. Preserve the terms, price, consent, and document version accepted at signing.
5. **Deposits.** Use a hosted checkout and record successful payments from verified provider webhooks. Tie each payment to the agreement, handle duplicate notifications, and define refunds and cancellations before accepting a deposit.
6. **Public launch.** Replace every labeled slot, confirm publication permission for photos and quotes, test on Lauren’s own phone, and decide when to enable indexing. If a pitch must be confidential, put it behind access control.

## Demo shortcuts and interpretations

- The four-digit PIN demonstrates the admin flow. Production access requires real identity and authorization.
- Local state can be edited, lost, or cleared. The copied signing URL identifies a record within the same browser profile. On another device it opens a sample. Real client links need random, revocable tokens and server-backed records.
- The demo stages email sends and views, and records typed or drawn signatures locally. Printing uses the browser’s PDF option. A real signing record needs a durable signed artifact and a trustworthy event history.
- Photo previews retain just the chosen filename. A production upload needs storage, image processing, responsive variants, and photographer-supplied alt text.
- Lead is an intake status alongside Draft, Sent, Viewed, and Signed. The sale applies to current package quotes. Issued contracts preserve their quoted fees.
- Previewing a date changes the automatic **theme** in the shared demo. Sale windows continue to follow the actual local date. Annual theme windows repeat, while sale dates include a year. Agree on the studio time zone before adding server-side scheduling.
- The pitch theme switcher affects its own tab so Cody can explore seasonal looks without publishing over Lauren’s selection. **Use live theme** returns to the shared setting.
- There are no live cross-device updates, real social destinations, delivery tracking, or payments. The public repo and page-level indexing instructions serve the requested low-profile pitch.
- The typed name and consent checkbox complete signing. Drawing is optional so someone using a keyboard can complete the same flow.

## Sample copy for the pitch

The demo uses “Lauren’s Studio Photography” as a proposed name and includes a sample introduction for Lauren to personalize. Five fictional households have session preferences, locations, and preparation notes. Existing browser records gain this copy only where the original bracketed placeholders remain. The former testimonial slots now explain the session experience so the pitch reads as a complete page without invented customer endorsements.

## Renbird branding

Renbird Photography replaces the proposed studio name throughout the demo, including the sample contracts. The source site at https://renbirdphotography.mypixieset.com/ requires browser verification in this environment. Its About and Contact copy is still pending source text from Cody.
