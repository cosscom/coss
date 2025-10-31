"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/registry/default/ui/tooltip"

export default function Particle() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <InputGroup>
      <Input
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        aria-label="Password with toggle visibility"
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              />
            }
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </TooltipTrigger>
          <TooltipPopup>
            {showPassword ? "Hide password" : "Show password"}
          </TooltipPopup>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  )
}
