import type { Meta, StoryObj } from "@storybook/react";
import ComponentDetails from "@/components/component-details";

const meta = {
  title: "UI/ComponentDetails",
  component: ComponentDetails,
} satisfies Meta<typeof ComponentDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
