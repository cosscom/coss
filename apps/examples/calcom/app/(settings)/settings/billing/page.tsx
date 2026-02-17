import {
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
} from "@coss/ui/components/card";

export default function BillingPage() {
  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Billing</CardFrameTitle>
          <CardFrameDescription>Manage all things billing</CardFrameDescription>
        </CardFrameHeader>
      </CardFrame>
    </div>
  );
}
