import type { RiskOutcome } from "@coss/companion";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Alert as NativeAlert, StyleSheet, TextInput, View } from "react-native";
import { Badge, StatusDot } from "../../../../../../../components/badge";
import { Button } from "../../../../../../../components/button";
import { EmptyState } from "../../../../../../../components/empty";
import { Panel, PanelBody, Ruled, SpecItem, SpecList } from "../../../../../../../components/panel";
import { ErrorState, Loading, PageIntro, Screen } from "../../../../../../../components/screen";
import { Stat, StatGrid } from "../../../../../../../components/stat";
import { Text } from "../../../../../../../components/text";
import { WebButton } from "../../../../../../../components/web-button";
import { formatDateTime } from "../../../../../../../lib/format";
import {
  ApiRequestError,
  useRiskAssessment,
  useRiskFeedback,
} from "../../../../../../../lib/queries";
import { DECISION_TONE, OUTCOME_TONE } from "../../../../../../../lib/status";
import { colors, fonts, radius, usePalette } from "../../../../../../../lib/theme";
import { type EnvironmentParams, environmentPath } from "../../../../../../../lib/web";

type EmailSignals = {
  valid: boolean;
  deliverability: string;
  disposable: boolean;
  role_account: boolean;
  free_provider: boolean;
  suggestion: string | null;
  domain_age_days: number | null;
} | null;

type IpSignals = {
  private: boolean;
  tor: boolean;
  hosting: boolean;
  hosting_kind: string | null;
  hosting_provider: string | null;
  asn: number | null;
  as_name: string | null;
  country: string | null;
  privacy: { vpn: boolean; proxy: boolean; relay: boolean; service: string | null } | null;
} | null;

const OUTCOMES: {
  value: RiskOutcome;
  label: string;
  variant: "outline" | "destructive-outline";
}[] = [
  { value: "legitimate", label: "Legitimate", variant: "outline" },
  { value: "abuse", label: "Abuse", variant: "destructive-outline" },
  { value: "fraud", label: "Fraud", variant: "destructive-outline" },
];

function Feedback(props: { params: EnvironmentParams; id: string }) {
  const [note, setNote] = useState("");
  const feedback = useRiskFeedback(props.params, props.id);
  const palette = usePalette();
  const send = (outcome: RiskOutcome, label: string) =>
    NativeAlert.alert(`Report as ${label.toLowerCase()}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: label,
        style: outcome === "legitimate" ? "default" : "destructive",
        onPress: () =>
          feedback.mutate(
            { outcome, ...(note.trim() ? { note: note.trim() } : {}) },
            {
              onSuccess: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setNote("");
              },
              onError: (error) =>
                NativeAlert.alert(
                  "Couldn't report the outcome",
                  error instanceof ApiRequestError ? error.message : "Try again.",
                ),
            },
          ),
      },
    ]);
  return (
    <Panel
      description="Fraud and abuse make later assessments flag this mailbox, user, card, browser, IP address and subnet; legitimate takes that back."
      title="Report an outcome"
    >
      <PanelBody>
        <TextInput
          maxLength={500}
          onChangeText={setNote}
          placeholder="Note (optional, for your team)"
          placeholderTextColor={palette.mutedForeground}
          style={styles.note}
          value={note}
        />
        <View style={styles.outcomes}>
          {OUTCOMES.map((outcome) => (
            <View key={outcome.value} style={styles.outcome}>
              <Button
                disabled={feedback.isPending}
                onPress={() => send(outcome.value, outcome.label)}
                size="sm"
                title={outcome.label}
                variant={outcome.variant}
              />
            </View>
          ))}
        </View>
      </PanelBody>
    </Panel>
  );
}

export default function RiskAssessmentScreen() {
  const { id, ...params } = useLocalSearchParams<EnvironmentParams & { id: string }>();
  const query = useRiskAssessment(params, id);
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const assessment = query.data;
  const email = assessment.signals.email as EmailSignals;
  const ip = assessment.signals.ip as IpSignals;
  // After 90 days, or when the user was forgotten.
  const removed = (value: string | null, group: unknown) => value ?? (group ? "Removed" : "—");
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen
        options={{
          title: "Assessment",
          headerRight: () => (
            <WebButton path={`${environmentPath(params)}/risk/${assessment.id}`} />
          ),
        }}
      />
      <PageIntro
        description={formatDateTime(assessment.created_at)}
        meta={
          <>
            <Badge variant="outline">
              <StatusDot
                label={assessment.decision}
                tone={DECISION_TONE[assessment.decision] ?? "neutral"}
              />
            </Badge>
            {assessment.outcome ? (
              <Badge variant={OUTCOME_TONE[assessment.outcome] ?? "secondary"}>
                {assessment.outcome}
              </Badge>
            ) : null}
            <Text muted numberOfLines={1} selectable style={styles.id} variant="mono">
              {assessment.id}
            </Text>
          </>
        }
        title={assessment.event_name ?? assessment.event}
      />
      <StatGrid>
        <Stat label="Score" value={assessment.score.toFixed(2)} />
        <Stat
          detail={
            assessment.degraded.length ? `degraded: ${assessment.degraded.join(", ")}` : undefined
          }
          label="Review"
          value={
            assessment.review_status === "open"
              ? "Open"
              : assessment.review_status === "resolved"
                ? "Resolved"
                : "—"
          }
        />
      </StatGrid>
      {assessment.can_review && assessment.review_status === "open" ? (
        <Feedback id={assessment.id} params={params} />
      ) : null}
      <Panel title="Reasons">
        {assessment.reasons.length === 0 ? (
          <EmptyState
            description="The assessment found nothing risky."
            icon={ShieldCheck}
            title="No risk signals fired"
          />
        ) : (
          <Ruled>
            {assessment.reasons.map((reason) => (
              <View key={reason.code} style={styles.reason}>
                <Badge mono variant="secondary">
                  {reason.code}
                </Badge>
                <Text variant="small">{reason.message}</Text>
              </View>
            ))}
          </Ruled>
        )}
      </Panel>
      <Panel
        footer={
          ip?.asn ? (
            <Text muted variant="small">
              Network and country data by{" "}
              <Text
                onPress={() => void WebBrowser.openBrowserAsync("https://ipinfo.io")}
                style={styles.link}
                variant="small"
              >
                IPinfo
              </Text>
              .
            </Text>
          ) : undefined
        }
        title="Signals"
      >
        <SpecList>
          <SpecItem label="User id" mono>
            {assessment.user.id ?? "—"}
          </SpecItem>
          <SpecItem label="Email">{removed(assessment.user.email, email)}</SpecItem>
          <SpecItem label="IP address" mono>
            {removed(assessment.ip, ip)}
          </SpecItem>
          {email ? (
            <SpecItem label="Email checks">
              {`${email.valid ? email.deliverability : "invalid"}${email.disposable ? " · disposable" : ""}${email.role_account ? " · role account" : ""}${email.free_provider ? " · free provider" : ""}`}
            </SpecItem>
          ) : null}
          {email ? <SpecItem label="Did you mean">{email.suggestion ?? "—"}</SpecItem> : null}
          {email ? (
            <SpecItem label="Domain age">
              {email.domain_age_days === null ? "—" : `${email.domain_age_days} days`}
            </SpecItem>
          ) : null}
          {ip ? (
            <SpecItem label="Network">{ip.asn ? `AS${ip.asn} ${ip.as_name ?? ""}` : "—"}</SpecItem>
          ) : null}
          {ip ? <SpecItem label="Country">{ip.country ?? "—"}</SpecItem> : null}
          {ip ? (
            <SpecItem label="IP checks">
              {ip.private
                ? "private address"
                : `Tor ${ip.tor ? "yes" : "no"} · ${ip.hosting ? `${ip.hosting_kind}: ${ip.hosting_provider}` : "not hosting"}`}
            </SpecItem>
          ) : null}
          {ip?.privacy ? (
            <SpecItem label="VPN, proxy, relay">
              {ip.privacy.vpn || ip.privacy.proxy || ip.privacy.relay
                ? [
                    ip.privacy.vpn && "VPN",
                    ip.privacy.proxy && "proxy",
                    ip.privacy.relay && "privacy relay",
                  ]
                    .filter(Boolean)
                    .join(" · ") + (ip.privacy.service ? ` (${ip.privacy.service})` : "")
                : "none"}
            </SpecItem>
          ) : null}
        </SpecList>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  id: { flexShrink: 1 },
  reason: { gap: 6, padding: 16, alignItems: "flex-start" },
  note: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.input,
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  outcomes: { flexDirection: "row", gap: 8 },
  outcome: { flex: 1 },
  link: { textDecorationLine: "underline" },
});
