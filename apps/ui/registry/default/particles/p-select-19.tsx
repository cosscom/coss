"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/registry/default/ui/avatar";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const users = [
  {
    avatar: "/avatars/01.png",
    initials: "JH",
    label: "Jenny Hamilton",
    value: "jenny",
  },
  {
    avatar: "/avatars/02.png",
    initials: "PS",
    label: "Paul Smith",
    value: "paul",
  },
  {
    avatar: "/avatars/03.png",
    initials: "LW",
    label: "Luna Wyen",
    value: "luna",
  },
];

export default function Particle() {
  return (
    <Select
      aria-label="Select user"
      defaultValue={users[0]}
      itemToStringValue={(item) => item.value}
    >
      <SelectTrigger>
        <SelectValue>
          {(item) => (
            <span className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage alt={item.label} src={item.avatar} />
                <AvatarFallback className="text-[10px]">
                  {item.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{item.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        <SelectGroup>
          <SelectGroupLabel>Impersonate user</SelectGroupLabel>
          {users.map((item) => (
            <SelectItem key={item.value} value={item}>
              <span className="flex items-center gap-2">
                <Avatar className="size-5">
                  <AvatarImage alt={item.label} src={item.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{item.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectPopup>
    </Select>
  );
}
