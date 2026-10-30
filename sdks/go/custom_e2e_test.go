// Hand-written (listed in .fernignore): end to end against the API's test app.
//
//	bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
//	COSS_E2E='<that JSON>' go test -run E2E .
//
// Skipped without COSS_E2E.

package coss_test

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"

	coss "github.com/cosscom/coss-go"
	cossclient "github.com/cosscom/coss-go/client"
	"github.com/cosscom/coss-go/email"
	"github.com/cosscom/coss-go/option"
)

func e2eClient(t *testing.T) *cossclient.Client {
	t.Helper()
	raw := os.Getenv("COSS_E2E")
	if raw == "" {
		t.Skip("COSS_E2E is not set (see the file comment)")
	}
	var server struct {
		BaseURL    string `json:"base_url"`
		SandboxKey string `json:"sandbox_key"`
	}
	if err := json.Unmarshal([]byte(raw), &server); err != nil {
		t.Fatal(err)
	}
	return cossclient.NewClient(option.WithAPIKey(server.SandboxKey), option.WithBaseURL(server.BaseURL))
}

func TestE2ESendGetAndList(t *testing.T) {
	client := e2eClient(t)
	ctx := context.Background()
	sent, err := client.Email.Send(ctx, &coss.SendEmailBody{Body: &coss.SendEmailRequest{
		From:    "Acme <hello@acme.test>",
		To:      &coss.SendEmailRequestTo{StringList: []string{"ada@example.com"}},
		Subject: coss.String("Hello from Go"),
		Text:    coss.String("It works."),
	}})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(sent.ID, "email_") {
		t.Fatalf("id %q", sent.ID)
	}
	fetched, err := client.Email.Get(ctx, &coss.GetEmailRequest{ID: sent.ID})
	if err != nil || fetched.ID != sent.ID {
		t.Fatalf("get: %v", err)
	}
	page, err := client.Email.List(ctx, &coss.ListEmailRequest{Limit: coss.Int(1)})
	if err != nil || len(page.Data) != 1 {
		t.Fatalf("list: %v", err)
	}
}

func TestE2EErrors(t *testing.T) {
	client := e2eClient(t)
	ctx := context.Background()
	_, err := client.Email.Send(ctx, &coss.SendEmailBody{Body: &coss.SendEmailRequest{
		From: "not an address",
		To:   &coss.SendEmailRequestTo{StringList: []string{"ada@example.com"}},
		Text: coss.String("Hi"),
	}})
	var invalid *coss.UnprocessableEntityError
	if !errors.As(err, &invalid) || invalid.Body.Error.Type != "invalid_request_error" || len(invalid.Body.Error.Issues) == 0 {
		t.Fatalf("want a 422 with issues, got %v", err)
	}
	_, err = client.Email.Get(ctx, &coss.GetEmailRequest{ID: "email_01k00000000000000000000000"})
	var notFound *coss.NotFoundError
	if !errors.As(err, &notFound) || !strings.HasPrefix(notFound.Body.Error.RequestID, "req_") {
		t.Fatalf("want a 404, got %v", err)
	}
}

func TestE2ECSVExport(t *testing.T) {
	client := e2eClient(t)
	csv, err := client.Email.Suppressions.Export(context.Background(), &email.ExportSuppressionsRequest{})
	if err != nil || !strings.HasPrefix(csv, "address,scope,reason,") {
		t.Fatalf("export: %q, %v", csv, err)
	}
}

// Reads without arguments: each response must decode into the generated types.
func TestE2EReads(t *testing.T) {
	client := e2eClient(t)
	ctx := context.Background()
	reads := map[string]func() error{
		"environment.get":       func() error { _, err := client.Environment.Get(ctx); return err },
		"reputation.get":        func() error { _, err := client.Reputation.Get(ctx); return err },
		"billing.get":           func() error { _, err := client.Billing.Get(ctx); return err },
		"logs.list":             func() error { _, err := client.Logs.List(ctx, &coss.ListLogsRequest{}); return err },
		"auditEvents.list":      func() error { _, err := client.AuditEvents.List(ctx, &coss.ListAuditEventsRequest{}); return err },
		"domains.list":          func() error { _, err := client.Domains.List(ctx, &coss.ListDomainsRequest{}); return err },
		"webhookEndpoints.list": func() error { _, err := client.WebhookEndpoints.List(ctx); return err },
		"email.tracking.get":    func() error { _, err := client.Email.Tracking.Get(ctx); return err },
		"risk.settings.get":     func() error { _, err := client.Risk.Settings.Get(ctx); return err },
		"risk.rules.list":       func() error { _, err := client.Risk.Rules.List(ctx); return err },
	}
	for name, read := range reads {
		t.Run(name, func(t *testing.T) {
			if err := read(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
