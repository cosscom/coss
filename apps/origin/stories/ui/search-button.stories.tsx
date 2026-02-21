import type { Meta, StoryObj } from "@storybook/react";
import SearchButton from "@/components/search-button";

const meta = {
  title: "UI/SearchButton",
  component: SearchButton,
} satisfies Meta<typeof SearchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
