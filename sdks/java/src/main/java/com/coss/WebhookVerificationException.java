// Hand-written (listed in .fernignore).
package com.coss;

/** A webhook request failed verification: reject it (e.g. respond 400). */
public final class WebhookVerificationException extends RuntimeException {
    public WebhookVerificationException(String message) {
        super(message);
    }
}
