import type { Meta, StoryObj } from "@storybook/react";
import { SubscribeBottom } from "@/components/subscribe-form";

const meta = {
  title: "UI/SubscribeForm",
  component: SubscribeBottom,
} satisfies Meta<typeof SubscribeBottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SubscribeBottom data-config-id="subscribe-bottom-default">Click me</SubscribeBottom>,
};
