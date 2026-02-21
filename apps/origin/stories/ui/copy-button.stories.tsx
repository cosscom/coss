import type { Meta, StoryObj } from "@storybook/react";
import CopyButton from "@/components/copy-button";

const meta = {
  title: "UI/CopyButton",
  component: CopyButton,
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
