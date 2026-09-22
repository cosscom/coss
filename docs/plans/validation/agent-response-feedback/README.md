# Response feedback consumer checks

This mounted test harness targets the **installed registry output**, rather than workspace aliases. Retained here so the submission-contract checks can be reproduced after changes.

In a disposable React 19 consumer configured for coss registry installation and the `@/*` → `./src/*` alias:

1. Install `@coss/agent-response-feedback` with the shadcn CLI against the local registry.
2. Install development dependencies `happy-dom@20.8.4` and `bun-types` if not already available.
3. Copy `behavior.test.tsx` to the consumer root.
4. Run `bun test behavior.test.tsx`.

The consumer also needs React DOM matching React. Tests expect generated components under `src/components/ui`. They cover async saves, clearing, controlled selection, disabling, optional negative fields, failure recovery, and pending duplicate/dismissal guards. Happy DOM can emit Base UI asynchronous `act` warnings; actual keyboard focus restoration, dialog cancellation/reset, and narrow layouts are verified separately in a browser.
