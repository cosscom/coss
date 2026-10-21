// Hand-written (listed in .fernignore): the generated client's request behaviour (headers,
// retries, idempotency keys).

package coss_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"

	coss "github.com/cosscom/coss-go"
	cossclient "github.com/cosscom/coss-go/client"
	"github.com/cosscom/coss-go/core"
	"github.com/cosscom/coss-go/option"
)

type recorded struct {
	mu       sync.Mutex
	requests []*http.Request
	bodies   [][]byte
}

// fakeAPI answers each request with the next status (the last one with the OpenAPI Email example).
func fakeAPI(t *testing.T, statuses ...int) (*httptest.Server, *recorded) {
	t.Helper()
	doc, err := os.ReadFile("../../apps/api/openapi.json")
	if err != nil {
		t.Fatal(err)
	}
	var openapi struct {
		Components struct {
			Schemas map[string]struct {
				Examples []json.RawMessage `json:"examples"`
			} `json:"schemas"`
		} `json:"components"`
	}
	if err := json.Unmarshal(doc, &openapi); err != nil {
		t.Fatal(err)
	}
	email := openapi.Components.Schemas["Email"].Examples[0]
	rec := &recorded{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		rec.mu.Lock()
		rec.requests = append(rec.requests, r)
		rec.bodies = append(rec.bodies, body)
		attempt := len(rec.requests) - 1
		rec.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		if attempt < len(statuses) && statuses[attempt] >= 300 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(statuses[attempt])
			_, _ = w.Write([]byte(`{"error":{"type":"api_error","code":"x","message":"No.","request_id":"req_1"}}`))
			return
		}
		_, _ = w.Write(email)
	}))
	t.Cleanup(server.Close)
	return server, rec
}

func newClient(server *httptest.Server) *cossclient.Client {
	return cossclient.NewClient(option.WithAPIKey("coss_test_key"), option.WithBaseURL(server.URL))
}

func TestSendsTheCossHeaders(t *testing.T) {
	server, rec := fakeAPI(t)
	if _, err := newClient(server).Email.Get(context.Background(), &coss.GetEmailRequest{ID: "email_1"}); err != nil {
		t.Fatal(err)
	}
	r := rec.requests[0]
	if r.URL.Path != "/v1/emails/email_1" || r.Header.Get("Authorization") != "Bearer coss_test_key" {
		t.Fatalf("unexpected request %s %v", r.URL, r.Header)
	}
	if ua := r.Header.Get("User-Agent"); ua != "coss-go/"+version(t) {
		t.Fatalf("User-Agent %q", ua)
	}
	if r.Header.Get("Coss-Version") == "" {
		t.Fatal("no Coss-Version")
	}
}

func TestRetriesAPostWithOneIdempotencyKey(t *testing.T) {
	server, rec := fakeAPI(t, 503, 409)
	_, err := newClient(server).Email.Send(context.Background(), &coss.SendEmailBody{
		Body: &coss.SendEmailRequest{From: "hello@acme.test", To: &coss.SendEmailRequestTo{StringList: []string{"someone@example.com"}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rec.requests) != 3 {
		t.Fatalf("%d attempts", len(rec.requests))
	}
	key := rec.requests[0].Header.Get("Idempotency-Key")
	for _, r := range rec.requests {
		if key == "" || r.Header.Get("Idempotency-Key") != key {
			t.Fatalf("idempotency keys differ: %q, %q", key, r.Header.Get("Idempotency-Key"))
		}
	}
}

func TestNeverRetriesClientErrors(t *testing.T) {
	for _, status := range []int{400, 402, 404, 422} {
		server, rec := fakeAPI(t, status)
		_, err := newClient(server).Email.Get(context.Background(), &coss.GetEmailRequest{ID: "email_1"})
		var apiError *core.APIError
		if !errors.As(err, &apiError) || apiError.StatusCode != status || len(rec.requests) != 1 {
			t.Fatalf("status %d: %v after %d attempts", status, err, len(rec.requests))
		}
	}
}

func TestNeverRetriesWhatTheAPIDoesNotDeduplicate(t *testing.T) {
	server, rec := fakeAPI(t, 503)
	_, err := newClient(server).WebhookEndpoints.Create(context.Background(), &coss.CreateWebhookEndpointRequest{URL: "https://example.com/hooks"})
	if err == nil || len(rec.requests) != 1 {
		t.Fatalf("%v after %d attempts", err, len(rec.requests))
	}
}

func TestSendsAnExplicitNullAndLeavesOmittedFieldsOut(t *testing.T) {
	server, rec := fakeAPI(t)
	request := &coss.UpdateWebhookEndpointRequest{ID: "we_1"}
	request.SetDescription(nil)
	_, _ = newClient(server).WebhookEndpoints.Update(context.Background(), request)
	if got := string(rec.bodies[0]); got != `{"description":null}` {
		t.Fatalf("body %s", got)
	}
}

func version(t *testing.T) string {
	t.Helper()
	raw, err := os.ReadFile("../VERSION")
	if err != nil {
		t.Fatal(err)
	}
	return string(raw[:len(raw)-1])
}
