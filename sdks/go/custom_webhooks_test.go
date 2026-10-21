// Hand-written (listed in .fernignore).

package coss_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"testing"
	"time"

	coss "github.com/cosscom/coss-go"
)

type webhookFixture struct {
	Secret           string `json:"secret"`
	Now              int64  `json:"now"`
	ToleranceSeconds int64  `json:"tolerance_seconds"`
	Cases            []struct {
		Name             string            `json:"name"`
		Kind             string            `json:"kind"`
		Payload          string            `json:"payload"`
		Headers          map[string]string `json:"headers"`
		Secret           *string           `json:"secret"`
		Now              *int64            `json:"now"`
		ToleranceSeconds *int64            `json:"tolerance_seconds"`
		Expect           struct {
			Value json.RawMessage `json:"value"`
			Error *string         `json:"error"`
		} `json:"expect"`
	} `json:"cases"`
}

func TestWebhookConformance(t *testing.T) {
	raw, err := os.ReadFile("../../integrations/conformance/webhooks.json")
	if err != nil {
		t.Fatal(err)
	}
	var fixture webhookFixture
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatal(err)
	}
	for _, c := range fixture.Cases {
		t.Run(c.Name, func(t *testing.T) {
			header := http.Header{}
			for name, value := range c.Headers {
				header.Set(name, value)
			}
			secret, now, tolerance := fixture.Secret, fixture.Now, fixture.ToleranceSeconds
			if c.Secret != nil {
				secret = *c.Secret
			}
			if c.Now != nil {
				now = *c.Now
			}
			if c.ToleranceSeconds != nil {
				tolerance = *c.ToleranceSeconds
			}
			opts := []coss.VerifyOption{coss.WithNow(time.Unix(now, 0)), coss.WithTolerance(time.Duration(tolerance) * time.Second)}

			var got any
			if c.Kind == "log_drain" {
				lines, verifyErr := coss.VerifyLogDrainBatch([]byte(c.Payload), header, secret, opts...)
				err = verifyErr
				if err == nil {
					decoded := []any{}
					for _, line := range lines {
						var value any
						_ = json.Unmarshal(line, &value)
						decoded = append(decoded, value)
					}
					got = decoded
				}
			} else {
				err = coss.VerifyWebhook([]byte(c.Payload), header, secret, &got, opts...)
			}

			if c.Expect.Error != nil {
				var verification *coss.WebhookVerificationError
				if !errors.As(err, &verification) || verification.Message != *c.Expect.Error {
					t.Fatalf("got error %v, want %q", err, *c.Expect.Error)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			var want any
			_ = json.Unmarshal(c.Expect.Value, &want)
			gotJSON, _ := json.Marshal(got)
			wantJSON, _ := json.Marshal(want)
			if string(gotJSON) != string(wantJSON) {
				t.Fatalf("got %s, want %s", gotJSON, wantJSON)
			}
		})
	}
}
