import type { Meta, StoryObj } from "@storybook/react";
import CliCommands from "@/components/cli-commands";

const meta = {
  title: "UI/CliCommands",
  component: CliCommands,
} satisfies Meta<typeof CliCommands>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "button",
  },
};
