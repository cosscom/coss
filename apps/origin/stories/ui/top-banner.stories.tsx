import type { Meta, StoryObj } from "@storybook/react";
import TopBanner from "@/components/top-banner";

const meta = {
  title: "UI/TopBanner",
  component: TopBanner,
} satisfies Meta<typeof TopBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
