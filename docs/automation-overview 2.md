# Vendor Email Automation

## Objective
Build an automated, reviewable workflow that turns varied vendor emails into structured installation appointments, stores them in Convex, and pushes the cleaned payloads through Hookdeck into FileMaker (with a PWA shoulder for manual intervention).

## Process flow
1. **Email ingestion**: Forward all vendor emails to a dedicated mailbox (or use delegated SMTP/webhook receivers) with filters to classify vendors, so every message enters the pipeline with a `vendorId` label.
2. **Hybrid parser**: Run each email through a rule-based extractor first (Mailparser, Parseur, or hosted regex templates). If the template fails or confidence is low, fall back to a heuristics/LLM step that looks for keywords such as `Customer`, `Flooring`, `Install`, `Confirm`. Flag those records for human review, and persist the raw HTML/text + metadata for auditing.
3. **Structured store (Convex)**: Push the normalized payload into Convex via a mutation. Capture the parsed fields, parsing metadata, vendor reference, timezone, and the original message identifier.
4. **Webhook fan-out**: Use Convex’s after-write trigger (or a scheduled watcher) to call Hookdeck with the appointment payload. Hookdeck queues/retries and forwards the payload to the FileMaker Data API (or any other CRM). Store the webhook result (success/error) back in Convex for traceability.
5. **PWA oversight & confirmation**: Surface every parsed job in a PWA dashboard so operators can review, correct, and confirm appointments. Saving an edit updates Convex and re-runs the webhook flow; tapping a confirmation link can either route through a safe proxy (to log clicks) or display the URL for manual activation.

## Key data model (Convex collection: `incomingRequests`)
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Auto-generated Convex document id |
| `vendorId` | string | Matches email sender or vendor config |
| `customerName` | string | Extracted from email body/subject |
| `installAddress` | string | Room/address details |
| `flooringType` | string | Product name/type |
| `installScope` | string | Areas sq ft, rooms, etc. |
| `confirmationUrl` | string | Link to confirm appointment (optional) |
| `confidenceScore` | number | Measure of parser confidence (0-1) |
| `sourceEmailId` | string | Message-id or envelope id |
| `rawEmail` | text | Store original HTML/plain text for audit |
| `status` | enum(`parsed`, `review`, `sent`, `error`) | Workflow state |
| `hookdeckResponse` | json | Keeps HTTP result from Hookdeck/FileMaker |

## Parsing strategy notes
- Maintain vendor-specific templates. If a vendor drifts, the parser falls back to keyword scans and, if needed, a small assisted review queue that allows manual annotations via the PWA and stores those corrections for retraining.
- Log every parse attempt, including the heuristics used, so you can continuously add rules to Mailparser or the fallback service.
- Use a configurable confidence threshold; anything below it auto-marks `status = review` so human eyes verify before CRM sync.

## PWA oversight experience
1. **Dashboard**: Lists incoming appointments grouped by `status`. Show vendor, customer, flooring type, confidence, and webhook result for quick triage.
2. **Detail/editor**: Operators can edit parsed values, view the raw email, and trigger a re-parse or confirm link click. The UI should re-sync with Convex mutations so the webhook runs again when fields change.
3. **Notifications**: Surface webhook errors (Hookdeck/FileMaker) so users can retry from the PWA.
4. **Confirmation workflow**: If the payload contains a `confirmationUrl`, keep it visible with a “Confirm” action that either opens in a controlled browser tab or hits a proxy endpoint that logs the request and marks `status = confirmed`.

## Reliability & ops
- Use Hookdeck’s retry/backoff for any FileMaker API errors and save the webhook log inside Convex.
- Consider a scheduled Convex job that re-checks stale `review` entries after 24 hours to remind humans.
- Keep a runtime log (e.g., one document per run) that tracks how many emails were parsed, how many hit `review`, and how many were delivered to FileMaker.

## Next deliverables (to bootstrap)
1. Build the parser service or adapter that can accept email payloads, apply templates, and emit the normalized JSON shown above.
2. Draft the Convex mutations + after-write hook that take the structured data and hit Hookdeck.
3. Sketch the first PWA screens (dashboard + detail editor) and wire them to the Convex collection via queries/mutations.
4. Wire Hookdeck to FileMaker’s Data API; define the webhook payload contract so FileMaker receives the fields it expects.

## Questions for the next iteration
1. Do you want to keep Mailparser as the only vendor-specific rule engine, or is the fallback parser acceptable to host ourselves?
2. Should confirmations trigger automatically (when confidence is high) or always wait for manual approval through the PWA?
3. What FileMaker layout or script needs to be called once the webhook arrives (payload shape, authentication)?
