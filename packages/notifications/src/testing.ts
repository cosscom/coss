import type { Notice, Notifier } from "./outbox.ts";

/** A notifier that keeps what it was asked to send; `fail` makes every send throw. */
export function recordingNotifier(opts: { fail?: boolean } = {}): Notifier & { sent: Notice[] } {
  const sent: Notice[] = [];
  return {
    sent,
    async send(notice) {
      if (opts.fail) throw new Error("Notifier failed (test).");
      sent.push(notice);
    },
  };
}
