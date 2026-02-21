import type { Meta, StoryObj } from "@storybook/react";
import CopyLayout from "@/components/copy-layout";

const meta = {
  title: "UI/CopyLayout",
  component: CopyLayout,
} satisfies Meta<typeof CopyLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
