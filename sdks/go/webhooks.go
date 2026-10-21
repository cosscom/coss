// Hand-written (listed in .fernignore): verifies coss.com webhook and log drain requests
// (Standard Webhooks signatures), like the TypeScript SDK's verifyWebhook and verifyLogDrainBatch.

package coss

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	webhookSecretPrefix     = "whsec_"
	defaultWebhookTolerance = 300 * time.Second
)

var webhookTimestamp = regexp.MustCompile(`^[0-9]+$`)

// WebhookVerificationError means a webhook request failed verification: reject it (e.g. respond
// 400).
type WebhookVerificationError struct {
	Message string
}

func (e *WebhookVerificationError) Error() string { return e.Message }

type verifyOptions struct {
	tolerance time.Duration
	now       time.Time
}

// VerifyOption configures VerifyWebhook and VerifyLogDrainBatch.
type VerifyOption func(*verifyOptions)

// WithTolerance sets the maximum age (and clock skew) of the webhook-timestamp. Default 5 minutes.
func WithTolerance(tolerance time.Duration) VerifyOption {
	return func(o *verifyOptions) { o.tolerance = tolerance }
}

// WithNow sets the current time; for tests.
func WithNow(now time.Time) VerifyOption {
	return func(o *verifyOptions) { o.now = now }
}

// VerifyWebhook checks the request's signature and age, then decodes the event into v (any value
// json.Unmarshal accepts, or nil to only verify). Pass the raw request body exactly as received
// (not re-encoded JSON), the request headers and the endpoint's whsec_… signing secret. It returns
// a *WebhookVerificationError when the request must be rejected. The same check verifies messages
// your own users receive from coss.com Hooks: pass that endpoint's secret.
func VerifyWebhook(payload []byte, header http.Header, secret string, v any, opts ...VerifyOption) error {
	if err := verifyWebhookSignature(payload, header, secret, opts); err != nil {
		return err
	}
	if !json.Valid(payload) {
		return &WebhookVerificationError{Message: "The webhook body is not valid JSON."}
	}
	if v == nil {
		return nil
	}
	if err := json.Unmarshal(payload, v); err != nil {
		return &WebhookVerificationError{Message: "The webhook body is not valid JSON."}
	}
	return nil
}

// VerifyLogDrainBatch checks a log drain request's signature and age, then returns its lines (the
// body is NDJSON: one log line or audit event per line). The webhook-id header is the batch id,
// the same on every retry of a batch: use it (or each line's id) to skip a batch you already
// stored. It returns a *WebhookVerificationError when the request must be rejected.
func VerifyLogDrainBatch(payload []byte, header http.Header, secret string, opts ...VerifyOption) ([]json.RawMessage, error) {
	if err := verifyWebhookSignature(payload, header, secret, opts); err != nil {
		return nil, err
	}
	lines := []json.RawMessage{}
	for _, line := range bytes.Split(payload, []byte("\n")) {
		if len(line) == 0 {
			continue
		}
		if !json.Valid(line) {
			return nil, &WebhookVerificationError{Message: "The log drain body is not valid NDJSON."}
		}
		lines = append(lines, json.RawMessage(line))
	}
	return lines, nil
}

func verifyWebhookSignature(payload []byte, header http.Header, secret string, opts []VerifyOption) error {
	options := verifyOptions{tolerance: defaultWebhookTolerance, now: time.Now()}
	for _, opt := range opts {
		opt(&options)
	}
	id := header.Get("webhook-id")
	timestamp := header.Get("webhook-timestamp")
	signatures := header.Get("webhook-signature")
	if id == "" || timestamp == "" || signatures == "" {
		return &WebhookVerificationError{Message: "Missing webhook-id, webhook-timestamp or webhook-signature."}
	}
	sentAt, err := strconv.ParseInt(timestamp, 10, 64)
	age := options.now.Unix() - sentAt
	if !webhookTimestamp.MatchString(timestamp) || err != nil || age > int64(options.tolerance.Seconds()) || -age > int64(options.tolerance.Seconds()) {
		return &WebhookVerificationError{Message: "The webhook timestamp is too old or in the future."}
	}

	key, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(secret, webhookSecretPrefix))
	if err != nil || len(key) == 0 {
		return &WebhookVerificationError{Message: "The signing secret is not a valid whsec_… secret."}
	}
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id + "." + timestamp + "."))
	mac.Write(payload)
	expected := mac.Sum(nil)
	// Several space-separated signatures are sent while a secret is being rotated.
	for _, candidate := range strings.Split(signatures, " ") {
		version, value, found := strings.Cut(candidate, ",")
		if !found || version != "v1" || value == "" {
			continue
		}
		signature, err := base64.StdEncoding.DecodeString(value)
		if err == nil && hmac.Equal(signature, expected) {
			return nil
		}
	}
	return &WebhookVerificationError{Message: "No webhook signature matches."}
}
