import type { Meta, StoryObj } from "@storybook/react";
import Cta from "@/components/cta";

const meta = {
  title: "UI/Cta",
  component: Cta,
} satisfies Meta<typeof Cta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
