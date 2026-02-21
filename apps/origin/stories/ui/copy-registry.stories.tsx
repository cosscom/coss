import type { Meta, StoryObj } from "@storybook/react";
import CopyRegistry from "@/components/copy-registry";

const meta = {
  title: "UI/CopyRegistry",
  component: CopyRegistry,
} satisfies Meta<typeof CopyRegistry>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
