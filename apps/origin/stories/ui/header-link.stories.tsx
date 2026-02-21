import type { Meta, StoryObj } from "@storybook/react";
import HeaderLink from "@/components/header-link";

const meta = {
  title: "UI/HeaderLink",
  component: HeaderLink,
} satisfies Meta<typeof HeaderLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
