import type { Meta, StoryObj } from "@storybook/react";
import OpenInV0 from "@/components/open-in-v0";

const meta = {
  title: "UI/OpenInV0",
  component: OpenInV0,
} satisfies Meta<typeof OpenInV0>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
